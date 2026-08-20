import type { Lang } from "@/lib/tree/types";

/**
 * Behandlingsguidens faste afsnit.
 *
 * Rækkefølgen er den kliniske rækkefølge man arbejder i — vurdér, køl, dæk,
 * væske, smerte, henvis, følg op — og ikke den rækkefølge kilderne tilfældigvis
 * står i. Det er hele forskellen på et opslagsværk og en søgeresultatside.
 *
 * Hvert afsnit har sine EGNE danske søgeord. Emnet lægeren skriver kommer oveni,
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
  /** Søgeord der definerer afsnittet. */
  terms: string;
}

export const AFSNIT: AfsnitDef[] = [
  {
    key: "assessment",
    label: { da: "Vurdering", en: "Assessment" },
    intent: {
      da: "Dybde, udbredelse og hvad der skal undersøges først",
      en: "Depth, extent and what to examine first",
    },
    terms: "brandsaarsdybde vurdering kapillaerrespons arealberegning",
  },
  {
    key: "firstaid",
    label: { da: "Køling og førstehjælp", en: "Cooling and first aid" },
    intent: {
      da: "Hvor længe, hvor koldt — og hvornår køling gør skade",
      en: "How long, how cold — and when cooling causes harm",
    },
    terms: "afkoeling skylning vandtemperatur minutter hypotermi",
  },
  {
    key: "wound",
    label: { da: "Sårbehandling og forbinding", en: "Wound care and dressing" },
    intent: {
      da: "Rensning, bullae og hvad såret pakkes ind i",
      en: "Cleansing, blisters and what the wound is dressed with",
    },
    terms: "bullae fjernes saarvask forbinding Mepilex gaze",
  },
  {
    key: "fluid",
    label: { da: "Væskebehandling", en: "Fluid resuscitation" },
    intent: {
      da: "Hvornår der væskebehandles, og hvordan mængden styres",
      en: "When to resuscitate, and how the volume is steered",
    },
    terms: "Parkland formel vaeskebehandling indikation timediurese",
  },
  {
    key: "pain",
    label: { da: "Smertebehandling", en: "Pain management" },
    intent: { da: "Analgesi under behandling og efter", en: "Analgesia during treatment and after" },
    terms: "smertebehandling analgesi morfin brandsaar",
  },
  {
    key: "referral",
    label: { da: "Henvisning og overflytning", en: "Referral and transfer" },
    intent: {
      da: "Hvornår du ringer, hvem du ringer til, og hvad du skal have klar",
      en: "When to call, who to call, and what to have ready",
    },
    terms: "overflytning brandsaarsafdeling kriterier kontakt vagthavende",
  },
  {
    key: "followup",
    label: { da: "Kontrol og opfølgning", en: "Follow-up" },
    intent: {
      da: "Hvornår patienten ses igen, og hvad der skal ses efter",
      en: "When the patient is seen again, and what to look for",
    },
    terms: "ambulant kontrol dage infektionstegn arvaev fysioterapi",
  },
];
