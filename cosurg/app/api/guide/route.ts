import { NextResponse } from "next/server";
import { cap, guard } from "@/lib/guard";
import { askAgent, ensureAgent } from "@/lib/corti/agent";
import {
  filtrerRelevante,
  mcpKonfigureret,
  soegKliniskViden,
  type KildeUddrag,
} from "@/lib/corti/mcp";
import type { Lang } from "@/lib/tree/types";
import { AFSNIT, erIndenforOmraadet, hoererTil, type AfsnitDef } from "./sections";
import { emnetTaalerBilleder, findAfsnitsBilleder, type GuideBillede } from "@/content/dressing-images";

export const dynamic = "force-dynamic";

/** Et emne er en tilstand, ikke et essay. Længere end dette er ikke et opslag. */
const MAX_EMNE = 160;

interface Body {
  topic?: string;
  lang?: Lang;
}

/**
 * Emne-fortolkeren.
 *
 * Den skriver INTET klinisk indhold. Dens eneste opgave er at oversætte det
 * lægen skrev — på dansk eller engelsk, i frit sprog — til de danske faglige
 * ord vores kilder faktisk er skrevet med. "deep dermal burn to the hand" skal
 * blive til "dyb dermal forbrænding hånd", ellers finder BM25-søgningen intet i
 * et dansk materiale.
 *
 * Det er præcis den arbejdsdeling appen bygger på: agenten fortolker, kilderne
 * svarer. Fejler agenten, søger vi videre på lægens egne ord — dårligere, men
 * aldrig forkert.
 */
const GUIDE_ROUTER_SPEC = {
  name: "cosurg-guide-topic-router",
  description: "Normalises a clinical burn topic into Danish search terms for a source lookup.",
  systemPrompt: [
    "You prepare a lookup in a Danish clinical knowledge base about burns.",
    "You NEVER answer the clinical question and NEVER write clinical advice.",
    "Your only job is to turn the clinician's topic into Danish clinical search terms.",
    "Danish burn sources use words like: forbrænding, skoldning, ætsning, brandsår, dybde, dyb dermal,",
    "fuldhudsskade, TBSA, arealberegning, afkøling, skylning, bullae, forbinding, væskebehandling,",
    "Parkland, inhalationsskade, cirkulær, aflastende incisioner, overflytning, ambulant kontrol.",
    "Return 4-8 Danish terms, lowercase, no punctuation, most specific first.",
    "Also return a short title for the topic in Danish and in English.",
    "If the topic is not about burns, scalds, chemical burns, frostbite or their treatment, set offTopic=true.",
  ].join(" "),
  connectors: [
    {
      type: "schema" as const,
      name: "submit_topic",
      description: "Submit the normalised topic and its Danish search terms.",
      transition: "complete" as const,
      schema: {
        type: "object",
        properties: {
          titleDa: { type: "string", description: "Short Danish title for the topic, max 60 chars." },
          titleEn: { type: "string", description: "Short English title for the topic, max 60 chars." },
          danishTerms: {
            type: "array",
            description: "4-8 Danish clinical search terms.",
            items: { type: "string" },
          },
          offTopic: { type: "boolean", description: "True if the topic is not about burns at all." },
        },
        required: ["titleDa", "titleEn", "danishTerms", "offTopic"],
      },
    },
  ],
};

interface RouterResult {
  titleDa: string;
  titleEn: string;
  danishTerms: string[];
  offTopic: boolean;
}

export interface GuideAfsnit {
  key: string;
  label: Record<Lang, string>;
  intent: Record<Lang, string>;
  excerpts: KildeUddrag[];
  /**
   * Procedurefotos der hører til afsnittets indhold — kortlagt som data i
   * `content/dressing-images.ts`, aldrig som modelskøn. Feltet er additivt:
   * mangler der dækning, er listen bare tom.
   */
  images?: GuideBillede[];
}

/** Ét uddrag med sin plads i det felt det blev fundet i. */
interface Kandidat {
  uddrag: KildeUddrag;
  /**
   * Scoren i forhold til feltets egen bedste træffer.
   *
   * BM25-tal fra to forskellige søgninger kan ikke sammenlignes direkte — en
   * søgning på sjældne ord giver høje tal, en søgning på almindelige ord lave.
   * Den normaliserede score kan, og den er derfor det eneste vi bruger når et
   * uddrag skal placeres i ét af flere afsnit.
   */
  norm: number;
}

function normaliser(uddrag: KildeUddrag[]): Kandidat[] {
  if (uddrag.length === 0) return [];
  const top = uddrag[0].relevans || 1;
  return uddrag.map((u) => ({ uddrag: u, norm: u.relevans / top }));
}

/**
 * Kandidater til ét afsnit.
 *
 * To søgninger, ikke én, fordi de fanger hver sin fejl:
 *
 * - Søger vi kun på EMNET plus afsnittets ord, dominerer emnet. En guide om en
 *   cirkulær forbrænding fik "aflastende incisioner" ind under
 *   *Smertebehandling*, fordi de ord rammer hårdere end "analgesi" gør.
 * - Søger vi kun på AFSNITTETS ord, bliver guiden den samme uanset hvilken
 *   tilstand man slog op. Så er det ikke et opslag, det er en forside.
 *
 * Derfor rangeres SNITTET højest: et uddrag der både handler om emnet og om
 * afsnittet. Derefter det afsnits-kanoniske. Et uddrag der kun blev fundet af
 * emnesøgningen kommer først i spil hvis afsnittet ellers ville stå næsten tomt
 * — det er dér risikoen for at vise noget malplaceret er mindre end risikoen
 * for at vise ingenting.
 */
async function kandidater(emneTermer: string, afsnit: AfsnitDef): Promise<Kandidat[]> {
  const soeg = (q: string, antal: number) =>
    soegKliniskViden(q, { antal, fuldt: true })
      // Nogle af brandsaar.dk's sider er rene stubbe — en overskrift og en
      // linje. De rammer fint i en søgning og siger ingenting i et opslagsværk.
      .then((s) => filtrerRelevante(s.uddrag).filter((u) => u.tekst.length >= 200))
      .catch(() => [] as KildeUddrag[]);

  // Det emne-åbne afsnit har ingen egne ord: dér er emnet hele spørgsmålet.
  if (afsnit.emneKun) {
    return normaliser(await soeg(emneTermer, 4));
  }

  const [emne, generel] = await Promise.all([
    soeg(`${emneTermer} ${afsnit.terms}`, 5),
    soeg(afsnit.terms, 5),
  ]);

  const emneNorm = new Map(normaliser(emne).map((k) => [k.uddrag.id, k.norm]));
  const generelNorm = new Map(normaliser(generel).map((k) => [k.uddrag.id, k.norm]));

  const alle = new Map<string, KildeUddrag>();
  [...emne, ...generel].forEach((u) => alle.set(u.id, u));

  return [...alle.values()]
    .filter((u) => hoererTil(afsnit, u.tekst, u.overskrifter))
    .map((u) => {
      const e = emneNorm.get(u.id) ?? 0;
      const g = generelNorm.get(u.id) ?? 0;
      // Snittet — emne OG afsnit — lægges oveni, så det altid slår et enkelt træf.
      return { uddrag: u, norm: e && g ? 1 + (e + g) / 2 : Math.max(e, g) };
    })
    .sort((a, b) => b.norm - a.norm);
}

export interface GuideSvar {
  topic: Record<Lang, string>;
  /** Hvem der fandt søgeordene: Cortis agent eller vores lokale reserve. */
  routedBy: "corti" | "lokal";
  terms: string[];
  sections: GuideAfsnit[];
  /** Antal afsnit med dækning. 0 betyder at emnet ikke findes i vores kilder. */
  covered: number;
  offTopic: boolean;
}

/**
 * Reserve når agenten ikke svarer: lægens egne ord, renset for stopord.
 *
 * Det er en dårligere oversættelse end agentens, men det er stadig et rigtigt
 * opslag i rigtige kilder — og det virker uden Corti. En guide der falder helt
 * ud fordi ét kald fejlede, ville være ubrugelig på et hospitals-wifi.
 */
const STOPORD = new Set([
  "en", "et", "den", "det", "de", "og", "eller", "med", "til", "for", "på", "i", "af", "som", "der",
  "hvad", "hvordan", "gør", "man", "ved", "jeg", "skal", "kan", "er", "the", "a", "an", "and", "or",
  "with", "to", "for", "on", "in", "of", "how", "what", "do", "does", "is", "are", "should",
]);

function lokaleTermer(topic: string): string[] {
  return topic
    .toLowerCase()
    .split(/[^\p{L}\p{N}%]+/u)
    .filter((w) => w.length > 2 && !STOPORD.has(w))
    .slice(0, 8);
}

async function findTermer(topic: string, lang: Lang): Promise<{ result: RouterResult; routedBy: "corti" | "lokal" }> {
  try {
    const agentId = await ensureAgent(GUIDE_ROUTER_SPEC);
    const { result } = await askAgent<RouterResult>(
      agentId,
      [
        `Clinician's topic (${lang}): "${topic}"`,
        "Return Danish clinical search terms for looking this up in Danish burn sources.",
      ].join("\n"),
    );
    if (Array.isArray(result?.danishTerms) && result.danishTerms.length > 0) {
      return { result, routedBy: "corti" };
    }
  } catch {
    // Falder igennem til den lokale reserve — årsagen står i routedBy.
  }
  const termer = lokaleTermer(topic);
  return {
    result: {
      titleDa: topic,
      titleEn: topic,
      danishTerms: termer.length > 0 ? termer : [topic],
      offTopic: false,
    },
    routedBy: "lokal",
  };
}

export async function POST(req: Request) {
  // Hvert opslag koster ét agent-kald plus syv MCP-søgninger. 20 pr. minut pr.
  // IP er rigeligt til et menneske der læser, og for lidt til en robot.
  const limited = guard(req, "guide", 20);
  if (limited) return limited;

  if (!mcpKonfigureret()) {
    return NextResponse.json(
      { error: "Vidensbasen er ikke konfigureret (MCP_URL / MCP_AUTH_TOKEN mangler)" },
      { status: 503 },
    );
  }

  try {
    const raw = (await req.json()) as Body;
    const lang: Lang = raw.lang === "en" ? "en" : "da";
    const topic = cap(raw.topic, MAX_EMNE);
    if (!topic) return NextResponse.json({ error: "Tomt emne" }, { status: 400 });

    /*
     * Emnet handler ikke om brandsår. Så slår vi det ikke op — og bruger ikke
     * et agent-kald på det.
     *
     * Agenten svarer nemlig på et fremmed emne med generiske brandsårsord
     * ("forbrænding, skoldning, ætsning"), og de finder rigeligt i vores
     * kilder: en komplet brandsårsguide til en brækket ankel. Den slags svar er
     * værre end intet svar, fordi det ser rigtigt ud.
     */
    const tomGuide = (titel: Record<Lang, string>): GuideSvar => ({
      topic: titel,
      routedBy: "lokal",
      terms: [],
      sections: AFSNIT.map((a) => ({ key: a.key, label: a.label, intent: a.intent, excerpts: [] })),
      covered: 0,
      offTopic: true,
    });

    if (!erIndenforOmraadet(topic)) {
      return NextResponse.json(tomGuide({ da: topic, en: topic }));
    }

    const { result, routedBy } = await findTermer(topic, lang);
    const terms = result.danishTerms.map((t) => String(t).slice(0, 60)).slice(0, 8);

    // Agentens egen vurdering er den anden port. Den er ikke stabil nok til at
    // stå alene, men et flag herfra på et emne der slap gennem ordprøven, er
    // værd at lytte til.
    if (result.offTopic) {
      return NextResponse.json({
        ...tomGuide({ da: result.titleDa || topic, en: result.titleEn || topic }),
        routedBy,
      });
    }
    // De mest specifikke ord først — de bærer emnet. Resten fortynder kun
    // afsnittets egne søgeord.
    const emneTermer = terms.slice(0, 4).join(" ");

    // Ét fejlet afsnit må ikke tage hele guiden med sig; kandidater() sluger
    // sine egne fejl, så afsnittet blot står uden dækning.
    const felter = await Promise.all(
      AFSNIT.map(async (a) => ({ key: a.key, kandidater: await kandidater(emneTermer, a) })),
    );

    /*
     * Samme uddrag kan vinde i to afsnit — overflytningskriterier rammer både
     * "henvisning" og "vurdering". Et opslagsværk der gentager sig selv er
     * ulæseligt, så hvert uddrag lander ét sted: dér hvor det passede bedst.
     * Ved uafgjort vinder det tidligste afsnit, fordi rækkefølgen er den
     * kliniske arbejdsgang — man vurderer før man henviser.
     */
    // Emneporten for procedurefotos: serien viser en hånd og Mepilex Transfer
    // og må aldrig illustrere fx en ætsning i ansigtet.
    const medBilleder = emnetTaalerBilleder(`${topic} ${terms.join(" ")}`);

    const ejer = new Map<string, { key: string; norm: number }>();
    for (const f of felter) {
      for (const k of f.kandidater) {
        const nu = ejer.get(k.uddrag.id);
        if (!nu || k.norm > nu.norm) ejer.set(k.uddrag.id, { key: f.key, norm: k.norm });
      }
    }

    const sections: GuideAfsnit[] = AFSNIT.map((a) => {
      const f = felter.find((x) => x.key === a.key);
      const egne = (f?.kandidater ?? []).filter((k) => ejer.get(k.uddrag.id)?.key === a.key);
      /*
       * Blev afsnittets eneste træffer taget af et andet afsnit, står det tomt
       * — og et tomt "Smertebehandling" læses som "der står intet om smerter",
       * hvilket er usandt. Afsnittet beholder derfor altid sin bedste træffer.
       */
      const grundlag = egne.length > 0 ? egne : (f?.kandidater ?? []).slice(0, 1);
      // Halen skæres af: et uddrag der scorer under halvdelen af afsnittets
      // bedste handler næsten altid om noget andet. Den bedste beholdes altid,
      // så en streng grænse ikke kan tømme et afsnit der faktisk har dækning.
      const valgte = grundlag.filter((k, i) => i === 0 || k.norm >= 0.45);
      const excerpts = valgte.slice(0, 3).map((k) => k.uddrag);
      /*
       * Fotos følger to porte: emnet skal handle om hånd/finger/arm eller
       * Mepilex, og gruppens egne ord skal stå i afsnittets faktiske tekst.
       * Matcher intet, er feltet en tom liste — hellere ingen end forkerte.
       */
      const images = medBilleder
        ? findAfsnitsBilleder(
            a.key,
            excerpts.map((u) => `${u.overskrifter.join(" ")} ${u.tekst}`).join(" "),
          )
        : [];
      return {
        key: a.key,
        label: a.label,
        intent: a.intent,
        excerpts,
        images,
      };
    });

    const svar: GuideSvar = {
      topic: { da: result.titleDa || topic, en: result.titleEn || topic },
      routedBy,
      terms,
      sections,
      covered: sections.filter((s) => s.excerpts.length > 0).length,
      offTopic: !!result.offTopic,
    };

    return NextResponse.json(svar);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ukendt fejl" },
      { status: 500 },
    );
  }
}
