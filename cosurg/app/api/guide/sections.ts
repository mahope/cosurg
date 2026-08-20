import type { Lang } from "@/lib/tree/types";

/**
 * Behandlingsguidens faste afsnit.
 *
 * Rækkefølgen er den kliniske rækkefølge man arbejder i — hvad er det for en
 * skade, vurdér, køl, dæk, væske, smerte, henvis, følg op — og ikke den
 * rækkefølge kilderne tilfældigvis står i. Det er hele forskellen på et
 * opslagsværk og en søgeresultatside.
 *
 * Hvert afsnit har sine EGNE danske søgeord. Emnet lægen skriver kommer oveni,
 * så "dyb dermal forbrænding på hånden" + "afkøling skylning" rammer
 * håndforbrændingssiden og ikke bare den generelle side om køling. Ordene er
 * danske uanset brugerens sprog, fordi kilderne er danske; oversættelsen fra et
 * engelsk spørgsmål sker i agenten, ikke her.
 */
export interface AfsnitDef {
  key: string;
  label: Record<Lang, string>;
  /** Hvad afsnittet skal svare på — vises som underrubrik, ikke som klinisk udsagn. */
  intent: Record<Lang, string>;
  /** Søgeord der definerer afsnittet. Tom for det emne-åbne afsnit. */
  terms: string;
  /**
   * Ord der SKAL optræde i uddraget for at det hører til afsnittet.
   *
   * BM25 finder altid noget. Uden den her prøve endte "aflastende incisioner"
   * under *Smertebehandling*, fordi emnets ord ramte hårdere end afsnittets
   * gjorde. Ordene er bevidst DISKRIMINERENDE: "brandsår" står i hver eneste
   * kilde og duer derfor ikke som prøve. Skrives foldet (æ→ae, ø→oe, å→aa) og
   * matches som præfiks, så "smerte" dækker smertestillende og smertebehandling.
   */
  must: string[];
  /** Sandt for afsnittet der kun søger på emnet — uden egne ord. */
  emneKun?: boolean;
}

export const AFSNIT: AfsnitDef[] = [
  {
    key: "topic",
    label: { da: "Om tilstanden", en: "About this condition" },
    intent: {
      da: "Det vores kilder siger om netop denne skade",
      en: "What our sources say about this injury specifically",
    },
    terms: "",
    must: [],
    emneKun: true,
  },
  {
    key: "assessment",
    label: { da: "Vurdering", en: "Assessment" },
    intent: {
      da: "Dybde, udbredelse og hvad der skal undersøges først",
      en: "Depth, extent and what to examine first",
    },
    terms: "brandsaarsdybde vurdering kapillaerrespons arealberegning",
    must: ["dybde", "dyb ", "kapillaer", "arealbereg", "tbsa", "grads", "inddeling", "vurder", "9%", "niergel"],
  },
  {
    key: "firstaid",
    label: { da: "Køling og førstehjælp", en: "Cooling and first aid" },
    intent: {
      da: "Hvor længe, hvor koldt — og hvornår køling gør skade",
      en: "How long, how cold — and when cooling causes harm",
    },
    terms: "afkoeling skylning vandtemperatur minutter hypotermi",
    must: ["skyl", "afkoel", "koel", "koelig", "vandtemperatur", "hypotermi", "foerstehjaelp"],
  },
  {
    key: "wound",
    label: { da: "Sårbehandling og forbinding", en: "Wound care and dressing" },
    intent: {
      da: "Rensning, bullae og hvad såret pakkes ind i",
      en: "Cleansing, blisters and what the wound is dressed with",
    },
    terms: "bullae fjernes saarvask forbinding Mepilex gaze",
    must: ["forbind", "bandage", "bullae", "mepilex", "jelonet", "gaze", "indpak", "saarvask", "debride"],
  },
  {
    key: "fluid",
    label: { da: "Væskebehandling", en: "Fluid resuscitation" },
    intent: {
      da: "Hvornår der væskebehandles, og hvordan mængden styres",
      en: "When to resuscitate, and how the volume is steered",
    },
    terms: "Parkland formel vaeskebehandling indikation timediurese",
    must: ["vaeske", "parkland", "diurese", "ringer", "infusion", "resuscit"],
  },
  {
    key: "pain",
    label: { da: "Smertebehandling", en: "Pain management" },
    intent: { da: "Analgesi under behandling og efter", en: "Analgesia during treatment and after" },
    terms: "smertebehandling analgesi morfin paracetamol",
    must: ["smerte", "analgesi", "morfin", "paracetamol", "opioid", "nsaid", "ketamin"],
  },
  {
    key: "referral",
    label: { da: "Henvisning og overflytning", en: "Referral and transfer" },
    intent: {
      da: "Hvornår du ringer, hvem du ringer til, og hvad du skal have klar",
      en: "When to call, who to call, and what to have ready",
    },
    terms: "overflytning brandsaarsafdeling kriterier kontakt vagthavende",
    must: ["overflyt", "henvis", "vagthavende", "brandsaarsafdeling", "brandsaarscenter", "brandsaarsambulator"],
  },
  {
    key: "followup",
    label: { da: "Kontrol og opfølgning", en: "Follow-up" },
    intent: {
      da: "Hvornår patienten ses igen, og hvad der skal ses efter",
      en: "When the patient is seen again, and what to look for",
    },
    terms: "ambulant kontrol dage infektionstegn arvaev fysioterapi",
    must: ["kontrol", "ambulant", "opfoelg", "infektionstegn", "fysioterapi", "arvaev", "hypertrofisk"],
  },
];

/** Folder danske tegn, så en prøve rammer uanset hvordan ordet er stavet. */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa");
}

/**
 * Ord der viser at et emne overhovedet hører til vores fagområde.
 *
 * Prøven er DETERMINISTISK med vilje. Agenten har et `offTopic`-felt, men den
 * er ikke stabil: samme spørgsmål om en brækket ankel blev flagget den ene gang
 * og ikke den anden — og når den ikke flagger, svarer den med generiske
 * brandsårsord ("forbrænding, skoldning, ætsning") som finder rigeligt i vores
 * kilder. Resultatet ville være en komplet brandsårsguide til en ankelfraktur:
 * forkert, og værst af alt overbevisende. Så vi spørger vores egne ord i stedet.
 */
const DOMAENEORD = [
  "forbraend", "braendt", "braendte", "brandsaar", "brandskade", "skold", "aetsning", "aetset",
  "forfrysning", "frostbite", "burn", "scald", "flamme", "flame", "ild", "kogende", "boiling",
  "damp", "steam", "inhalation", "roegforgift", "smoke", "tbsa", "parkland", "escharotomi",
  "eschar", "incision", "hypotermi", "bullae", "blister", "kemisk", "chemical", "elektrisk",
  "electric", "hoejspaending", "voltage", "diphoterine", "flussyre", "mepilex", "dermal",
  "fuldhud", "full thickness", "epidermal", "forbinding", "dressing", "cirkulaer", "circumferential",
];

/** Kan emnet overhovedet være dækket af vores kilder? */
export function erIndenforOmraadet(emne: string): boolean {
  const f = fold(emne);
  return DOMAENEORD.some((d) => f.includes(fold(d)));
}

/** Handler uddraget overhovedet om det afsnit det er på vej ind i? */
export function hoererTil(afsnit: AfsnitDef, tekst: string, overskrifter: string[]): boolean {
  if (afsnit.must.length === 0) return true;
  const felt = fold(`${overskrifter.join(" ")} ${tekst}`);
  return afsnit.must.some((m) => felt.includes(fold(m)));
}
