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
import { AFSNIT } from "./sections";

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

    const { result, routedBy } = await findTermer(topic, lang);
    const terms = result.danishTerms.map((t) => String(t).slice(0, 60)).slice(0, 8);
    // De mest specifikke ord først — de bærer emnet. Resten fortynder kun
    // afsnittets egne søgeord.
    const emneTermer = terms.slice(0, 4).join(" ");

    const soegninger = await Promise.all(
      AFSNIT.map(async (a) => {
        try {
          const svar = await soegKliniskViden(`${emneTermer} ${a.terms}`, { antal: 4, fuldt: true });
          return { key: a.key, uddrag: filtrerRelevante(svar.uddrag) };
        } catch {
          // Ét fejlet afsnit må ikke tage hele guiden med sig. Afsnittet står
          // tomt, og siden fortæller at der ikke var dækning her.
          return { key: a.key, uddrag: [] as KildeUddrag[] };
        }
      }),
    );

    /*
     * Samme uddrag kan vinde i to afsnit — overflytningskriterier rammer både
     * "henvisning" og "vurdering". Et opslagsværk der gentager sig selv er
     * ulæseligt, så hvert uddrag lander ét sted: dér hvor det scorede højest.
     */
    const bedste = new Map<string, { key: string; relevans: number }>();
    for (const s of soegninger) {
      for (const u of s.uddrag) {
        const nu = bedste.get(u.id);
        if (!nu || u.relevans > nu.relevans) bedste.set(u.id, { key: s.key, relevans: u.relevans });
      }
    }

    const sections: GuideAfsnit[] = AFSNIT.map((a) => {
      const fundet = soegninger.find((s) => s.key === a.key);
      return {
        key: a.key,
        label: a.label,
        intent: a.intent,
        excerpts: (fundet?.uddrag ?? []).filter((u) => bedste.get(u.id)?.key === a.key).slice(0, 3),
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
