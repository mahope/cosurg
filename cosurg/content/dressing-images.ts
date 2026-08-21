import type { Lang } from "@/lib/tree/types";
import { fold } from "@/app/api/guide/sections";

/**
 * Forbindingsfotos til behandlingsguiden.
 *
 * Fotoserien er Rigshospitalets step-by-step-guide til Mepilex Transfer på
 * fingre, hænder og arme (Afsnit 6052) — de samme billeder som beslutningstræet
 * `dressing-hand-arm` viser trin for trin. Her er de kortlagt som DATA: hvilke
 * ord i et guideafsnit der berettiger hvilke fotos. Ingen model gætter.
 *
 * To porte skal begge åbnes før et foto vises:
 *
 * 1. EMNEPORTEN: opslaget skal overhovedet handle om hånd/finger/arm eller om
 *    Mepilex. Fotoserien viser en hånd — den må aldrig illustrere en guide om
 *    fx en ætsning i ansigtet, uanset hvor godt ordene ellers rammer.
 * 2. AFSNITSPORTEN: gruppens egne ord skal stå i det afsnit den lægges ved, og
 *    afsnittet skal være ét hvor forbindingsfotos hører hjemme (sårbehandling,
 *    opfølgning). "Gaze" i et væskeafsnit udløser ingenting.
 *
 * Hellere ingen billeder end forkerte: rammer ingen gruppe, vises intet.
 */

export interface GuideBillede {
  src: string;
  alt: Record<Lang, string>;
  credit: string;
}

interface BilledGruppe {
  /** Foldede ord (æ→ae …) hvoraf mindst ét skal stå i afsnitsteksten. */
  triggers: string[];
  /** Afsnit hvor gruppen må vises. */
  afsnit: string[];
  billeder: GuideBillede[];
}

const CREDIT =
  "Rigshospitalet, Afsnit for plastikkirurgi og brandsårsbehandling 6052";

function serie(numre: number[], alt: Record<Lang, string>): GuideBillede[] {
  return numre.map((n) => ({ src: `/step-images/image${n}.jpg`, alt, credit: CREDIT }));
}

/**
 * Grupperne følger trinnene i Rigshospitalets guide (billede 1-34). Billede
 * 35-56 findes også i /public/step-images, men er ikke beskrevet i noget af
 * vores materiale — de er bevidst udeladt, fordi vi ikke kan skrive en ærlig
 * alt-tekst til et foto vi ikke kender indholdet af.
 */
const GRUPPER: BilledGruppe[] = [
  {
    triggers: ["bullae", "blister", "loes hud", "debrid"],
    afsnit: ["wound"],
    billeder: serie([1, 2, 3], {
      da: "Klargøring af såret: løs hud og bullae fjernes",
      en: "Preparing the wound: loose skin and blisters are removed",
    }),
  },
  {
    triggers: ["saebevask", "saarvask", "saebe"],
    afsnit: ["wound"],
    billeder: serie([4, 5, 6], {
      da: "Sårene sæbevaskes i cirka ti minutter",
      en: "The wounds are washed with soap for about ten minutes",
    }),
  },
  {
    triggers: ["postevand", "skylles med vand", "saeben skylles"],
    afsnit: ["wound"],
    billeder: serie([7, 8, 9], {
      da: "Sæben skylles af med postevand",
      en: "The soap is rinsed off with tap water",
    }),
  },
  {
    triggers: ["duppes", "dup toert", "toerres omkring"],
    afsnit: ["wound"],
    billeder: serie([10, 11, 12], {
      da: "Der duppes tørt omkring såret — ikke på selve såret",
      en: "The area around the wound is patted dry — not the wound itself",
    }),
  },
  {
    triggers: ["mepilex", "tilklip"],
    afsnit: ["wound"],
    billeder: serie([13, 14, 15], {
      da: "Mepilex Transfer tilklippes så den dækker såret med god margin",
      en: "The Mepilex Transfer is cut to cover the wound with a good margin",
    }),
  },
  {
    triggers: ["mepilex"],
    afsnit: ["wound"],
    billeder: serie([16, 17, 18], {
      da: "Mepilex Transfer lægges på med klæbesiden mod såret",
      en: "The Mepilex Transfer is applied with the adhesive side to the wound",
    }),
  },
  {
    triggers: ["hud mod hud", "enkeltvis", "finger"],
    afsnit: ["wound"],
    billeder: serie([19, 20, 21], {
      da: "Hver finger pakkes enkeltvis, så de ikke ligger hud mod hud",
      en: "Each finger is wrapped individually so no skin touches skin",
    }),
  },
  {
    triggers: ["gaze"],
    afsnit: ["wound"],
    billeder: serie([22, 23, 24], {
      da: "Sugende gaze lægges over forbindingen",
      en: "Absorbent gauze is applied over the dressing",
    }),
  },
  {
    triggers: ["funktionsstilling"],
    afsnit: ["wound"],
    billeder: serie([25, 26, 27], {
      da: "Fingrene holdes i funktionsstilling under indpakningen",
      en: "The fingers are kept in a functional position while wrapping",
    }),
  },
  {
    triggers: ["elastikbind", "elastisk bind"],
    afsnit: ["wound"],
    billeder: serie([28, 29, 30], {
      da: "Forbindingen fikseres med elastikbind — fast, men ikke stramt",
      en: "The dressing is secured with an elastic bandage — firm, but not tight",
    }),
  },
  {
    triggers: ["tourniquet", "fingerspids"],
    afsnit: ["wound"],
    billeder: serie([31, 32, 33], {
      da: "Fingerspidserne efterlades synlige til observation for tourniquet-effekt",
      en: "The fingertips are left visible to observe for tourniquet effect",
    }),
  },
  {
    triggers: ["gennemsivning", "udpakning", "ti dage", "10 dage", "10-14 dage"],
    afsnit: ["wound", "followup"],
    billeder: serie([34], {
      da: "Færdig forbinding — sidder urørt i ti dage uden gennemsivning eller infektionstegn",
      en: "Finished dressing — left untouched for ten days unless there is strike-through or signs of infection",
    }),
  },
];

/** Emneporten: fotoserien viser en hånd og Mepilex — kun dér hører den hjemme. */
const EMNEORD = ["haand", "finger", "arm", "mepilex"];

/** Flere afsnit kan ramme flere grupper — men et opslag er ikke et fotoalbum. */
const MAKS_PR_AFSNIT = 4;

export function emnetTaalerBilleder(emneKontekst: string): boolean {
  const f = fold(emneKontekst);
  return EMNEORD.some((o) => f.includes(o));
}

/**
 * Fotos til ét afsnit: gruppens ord skal stå i afsnittets egen tekst.
 * Rækkefølgen er procedurens — klargøring før indpakning før fiksering.
 */
export function findAfsnitsBilleder(afsnitKey: string, afsnitTekst: string): GuideBillede[] {
  const f = fold(afsnitTekst);
  const valgte: GuideBillede[] = [];
  const set = new Set<string>();
  for (const g of GRUPPER) {
    if (!g.afsnit.includes(afsnitKey)) continue;
    if (!g.triggers.some((t) => f.includes(t))) continue;
    for (const b of g.billeder) {
      if (set.has(b.src) || valgte.length >= MAKS_PR_AFSNIT) continue;
      set.add(b.src);
      valgte.push(b);
    }
  }
  return valgte;
}
