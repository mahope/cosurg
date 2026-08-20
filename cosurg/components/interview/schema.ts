import type { Lang } from "@/lib/tree/types";

/**
 * Den strukturerede anamnese ved et brandsår.
 *
 * Skemaet er IKKE et beslutningstræ. Et træ fører én vej og spørger i en fast
 * rækkefølge; en anamnese optages i den rækkefølge patienten fortæller, og
 * lægen skal kunne se hvad der stadig mangler — ikke tvinges gennem punkterne
 * ét ad gangen. Derfor en egen visning, men med samme stemmelag som træet.
 *
 * Felterne er valgt fordi de ÆNDRER behandlingen: skadesmekanisme og
 * skadestidspunkt styrer skylning og væske, vægt og TBSA styrer Parkland,
 * antikoagulantia og tetanus ændrer hvad der skal gøres inden patienten går
 * hjem. Et felt der ikke ændrer noget, hører ikke i en tjekliste under tidspres.
 */

export type FeltType = "choice" | "boolean" | "number" | "text";
export type Gruppe = "injury" | "patient";

export interface FeltOption {
  value: string;
  label: Record<Lang, string>;
}

export interface Felt {
  id: string;
  gruppe: Gruppe;
  label: Record<Lang, string>;
  /** Spørgsmålet lægen skal stille. Formuleret så det kan læses højt som det står. */
  question: Record<Lang, string>;
  type: FeltType;
  options?: FeltOption[];
  unit?: Record<Lang, string>;
  /** Skal med før anamnesen er komplet. */
  required: boolean;
}

const JA_NEJ: FeltOption[] = [
  { value: "yes", label: { da: "Ja", en: "Yes" } },
  { value: "no", label: { da: "Nej", en: "No" } },
  { value: "unknown", label: { da: "Ved ikke", en: "Unknown" } },
];

export const FELTER: Felt[] = [
  {
    id: "mechanism",
    gruppe: "injury",
    label: { da: "Skadesmekanisme", en: "Mechanism of injury" },
    question: { da: "Hvordan skete skaden?", en: "How did the injury happen?" },
    type: "choice",
    required: true,
    options: [
      { value: "flame", label: { da: "Flamme/ild", en: "Flame/fire" } },
      { value: "scald", label: { da: "Skoldning (væske/damp)", en: "Scald (liquid/steam)" } },
      { value: "contact", label: { da: "Kontakt med varm genstand", en: "Contact with a hot object" } },
      { value: "chemical", label: { da: "Ætsning (kemisk)", en: "Chemical" } },
      { value: "electrical", label: { da: "Elektrisk", en: "Electrical" } },
      { value: "other", label: { da: "Andet", en: "Other" } },
    ],
  },
  {
    id: "timeSince",
    gruppe: "injury",
    label: { da: "Tid siden skaden", en: "Time since injury" },
    question: { da: "Hvornår skete det — hvor mange minutter eller timer siden?", en: "When did it happen — how many minutes or hours ago?" },
    type: "number",
    unit: { da: "minutter", en: "minutes" },
    required: true,
  },
  {
    id: "closedSpace",
    gruppe: "injury",
    label: { da: "Røg i lukket rum", en: "Smoke in an enclosed space" },
    question: { da: "Var der røg, og skete det i et lukket rum?", en: "Was there smoke, and did it happen in an enclosed space?" },
    type: "boolean",
    options: JA_NEJ,
    required: true,
  },
  {
    id: "location",
    gruppe: "injury",
    label: { da: "Lokalisation", en: "Location on the body" },
    question: { da: "Hvor på kroppen sidder skaden?", en: "Where on the body is the injury?" },
    type: "text",
    required: true,
  },
  {
    id: "tbsa",
    gruppe: "injury",
    label: { da: "Udbredelse (TBSA)", en: "Extent (TBSA)" },
    question: { da: "Hvor stor en del af kroppen er ramt, i procent?", en: "How much of the body is affected, in percent?" },
    type: "number",
    unit: { da: "% TBSA", en: "% TBSA" },
    required: true,
  },
  {
    id: "cooled",
    gruppe: "injury",
    label: { da: "Køling/skylning givet", en: "Cooling/irrigation given" },
    question: { da: "Er såret blevet skyllet eller kølet — og hvor længe?", en: "Has the wound been irrigated or cooled — and for how long?" },
    type: "boolean",
    options: JA_NEJ,
    required: true,
  },
  {
    id: "age",
    gruppe: "patient",
    label: { da: "Alder", en: "Age" },
    question: { da: "Hvor gammel er patienten?", en: "How old is the patient?" },
    type: "number",
    unit: { da: "år", en: "years" },
    required: true,
  },
  {
    id: "weight",
    gruppe: "patient",
    label: { da: "Vægt", en: "Weight" },
    question: { da: "Hvad vejer patienten?", en: "What does the patient weigh?" },
    type: "number",
    unit: { da: "kg", en: "kg" },
    required: true,
  },
  {
    id: "allergies",
    gruppe: "patient",
    label: { da: "Allergier", en: "Allergies" },
    question: { da: "Har patienten nogen allergier?", en: "Does the patient have any allergies?" },
    type: "text",
    required: true,
  },
  {
    id: "anticoagulants",
    gruppe: "patient",
    label: { da: "Antikoagulantia", en: "Anticoagulants" },
    question: { da: "Får patienten blodfortyndende medicin?", en: "Is the patient on anticoagulants?" },
    type: "boolean",
    options: JA_NEJ,
    required: true,
  },
  {
    id: "tetanus",
    gruppe: "patient",
    label: { da: "Tetanusstatus", en: "Tetanus status" },
    question: { da: "Er patienten tetanusvaccineret inden for de sidste ti år?", en: "Has the patient had a tetanus vaccination in the last ten years?" },
    type: "choice",
    required: true,
    options: [
      { value: "current", label: { da: "Dækket", en: "Covered" } },
      { value: "outdated", label: { da: "Ikke dækket", en: "Not covered" } },
      { value: "unknown", label: { da: "Ved ikke", en: "Unknown" } },
    ],
  },
  {
    id: "comorbidity",
    gruppe: "patient",
    label: { da: "Anden sygdom og medicin", en: "Other illness and medication" },
    question: { da: "Har patienten anden sygdom eller fast medicin der har betydning?", en: "Any other illness or regular medication that matters here?" },
    type: "text",
    required: false,
  },
];

export const GRUPPE_LABEL: Record<Gruppe, Record<Lang, string>> = {
  injury: { da: "Skaden", en: "The injury" },
  patient: { da: "Patienten", en: "The patient" },
};

export function findFelt(id: string): Felt | undefined {
  return FELTER.find((f) => f.id === id);
}

/** Ét besvaret felt. `display` er det der står på skærmen og i resuméet. */
export interface Besvarelse {
  value: string;
  display: string;
  /** Hvad i det talte/skrevne der udløste svaret. Sporbarhed, ikke pynt. */
  matched?: string;
  kilde: "voice" | "manual";
}

export type Anamnese = Record<string, Besvarelse | undefined>;
