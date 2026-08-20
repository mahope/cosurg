import type { Lang } from "@/lib/tree/types";

/**
 * Faldgruber — det erfarne klinikere ved, og yngre læger lærer den hårde vej.
 *
 * To ting gør det her til noget andet end en liste med gode råd:
 *
 * 1. **Ingen faldgrube bærer sin egen sandhed.** Overskriften herunder er VORES
 *    formulering — en tro omskrivning, ikke en kilde. Selve udsagnet hentes ved
 *    opslag i CoSurgs MCP-server (`query`), og kortet viser det ordret med sin
 *    URL. Kan serveren ikke belægge faldgruben, siger kortet det og påstår
 *    intet. Vi har kun taget faldgruber med som vi har verificeret dækning for.
 *
 * 2. **De er knyttet til et sted i forløbet.** En faldgrube der dukker op på
 *    rette tidspunkt er ti gange en man skal huske at slå op. `triggers` siger
 *    hvornår: hvilken node i hvilket træ, hvilke svar, hvilken disposition —
 *    eller hvilket felt i anamnesen.
 *
 * Faldgruben om KOPIERET JOURNALTEKST, som ellers er velkendt, står bevidst
 * ikke her: vores kilder handler om brandsårsbehandling og siger intet om
 * dokumentation. Vi opfinder ikke en kilde til den.
 */

export type Alvor = "critical" | "important";

/** Hvor i et brandsårsforløb faldgruben hører hjemme, når man bladrer dem igennem. */
export type Fase = "history" | "assessment" | "resuscitation" | "wound" | "handover";

export interface Traekker {
  /** Beslutningstræ den gælder i. Udeladt = alle træer. */
  treeId?: string;
  /** Node i træet. Udeladt = uanset hvor i træet man står. */
  nodeId?: string;
  /** Kun ved disse svarværdier. Udeladt = alle svar på noden. */
  values?: string[];
  /** Vist når forløbet er endt i denne disposition. */
  dispositionId?: string;
  /** Felt i den strukturerede anamnese (/interview). */
  field?: string;
}

export interface Faldgrube {
  id: string;
  /** Vores overskrift — en omskrivning af uddraget, aldrig et selvstændigt udsagn. */
  title: Record<Lang, string>;
  /** Hvad der konkret går galt, hvis man overser den. */
  consequence: Record<Lang, string>;
  alvor: Alvor;
  fase: Fase;
  /** Søgningen der henter belægget fra vidensbasen. Danske ord — kilderne er danske. */
  query: string;
  triggers: Traekker[];
  /**
   * Ord der peger på faldgruben når man slår et EMNE op i behandlingsguiden.
   *
   * Guiden har ingen node at hænge en trækker på — der er kun det lægen skrev,
   * og de danske søgeord agenten lavede af det. Så en tilstand der nævner
   * "cirkulær" skal have perfusions-faldgruben frem, uanset hvor i et forløb
   * man ellers ville være. Foldes og matches som præfiks (se `fold`).
   */
  hints: string[];
}

export const FALDGRUBER: Faldgrube[] = [
  {
    id: "circumferential-perfusion",
    title: {
      da: "Cirkulær dyb forbrænding: det er perfusionen der afgør, ikke såret",
      en: "Circumferential deep burn: perfusion decides, not the wound",
    },
    consequence: {
      da: "Ødemet tiltager over timer. Kredsløbet distalt kan svigte efter at du har set patienten.",
      en: "Oedema builds over hours. Distal perfusion can fail after you have seen the patient.",
    },
    alvor: "critical",
    fase: "assessment",
    query: "cirkulaer forbraending aflastende incisioner nedsat perfusion",
    hints: ["cirkulaer", "aflastende", "escharotomi", "fuldhud", "dyb dermal", "underarm", "ekstremitet"],
    triggers: [
      { treeId: "burns-dk", nodeId: "circumferential" },
      { treeId: "burns-dk", nodeId: "depth", values: ["deep-dermal", "full-thickness"] },
    ],
  },
  {
    id: "inhalation-delayed",
    title: {
      da: "Inhalationsskade kan udvikle sig over timer",
      en: "Inhalation injury can develop over hours",
    },
    consequence: {
      da: "En upåvirket patient nu er ikke en frikendt patient. Luftvejen kan lukke sig senere på vagten.",
      en: "An unaffected patient now is not a cleared patient. The airway can close later in the shift.",
    },
    alvor: "critical",
    fase: "assessment",
    query: "inhalationsskade tegn re-vurdere udvikle sig over tid stridor",
    hints: ["inhalation", "roeg", "flamme", "ildebrand", "ansigt", "lukket rum", "sod", "luftvej"],
    triggers: [
      { treeId: "burns-dk", nodeId: "inhalation" },
      { treeId: "burns-dk", nodeId: "mechanism", values: ["flame"] },
      { field: "closedSpace", values: ["yes"] },
      { field: "mechanism", values: ["flame"] },
    ],
  },
  {
    id: "cooling-hypothermia",
    title: {
      da: "Køling: vandtemperaturen er faldgruben, ikke varigheden",
      en: "Cooling: the water temperature is the trap, not the duration",
    },
    consequence: {
      da: "For koldt vand køler patienten i stedet for såret — og hypotermi forværrer alt det der følger.",
      en: "Water that is too cold cools the patient instead of the wound — and hypothermia worsens everything after.",
    },
    alvor: "important",
    fase: "resuscitation",
    query: "afkoeling skylning vandtemperatur under 8 grader hypotermi 20-30 minutter",
    hints: ["afkoel", "koeling", "skyl", "skoldning", "kogende", "hypotermi", "foerstehjaelp", "vand"],
    triggers: [
      { treeId: "burns-dk", nodeId: "cooled" },
      { field: "cooled" },
    ],
  },
  {
    id: "tbsa-erythema",
    title: {
      da: "Rødme uden blærer tæller ikke med i arealet",
      en: "Redness without blisters does not count towards the area",
    },
    consequence: {
      da: "Tælles erytemet med, bliver TBSA for høj — og væskebehandlingen bliver for stor.",
      en: "Counting erythema inflates TBSA — and the fluid resuscitation with it.",
    },
    alvor: "important",
    fase: "assessment",
    query: "1. grads epidermal erytem medregnes ikke i brandsaarsarealet",
    hints: ["tbsa", "areal", "udbredelse", "procent", "epidermal", "erytem", "1. grads", "roedme"],
    triggers: [
      { treeId: "burns-dk", nodeId: "tbsa" },
      { treeId: "burns-dk", nodeId: "depth", values: ["epidermal"] },
      { field: "tbsa" },
    ],
  },
  {
    id: "fluid-diuresis",
    title: {
      da: "Formlen er startbuddet — timediuresen styrer resten",
      en: "The formula is the starting bid — hourly diuresis steers the rest",
    },
    consequence: {
      da: "Væskeskema og timediurese er det der fanger både under- og overresuscitering.",
      en: "The fluid chart and hourly diuresis are what catch both under- and over-resuscitation.",
    },
    alvor: "important",
    fase: "resuscitation",
    query: "timediurese vaeskeskema justering af vaeskeindgift Parkland",
    hints: ["vaeske", "parkland", "resuscit", "diurese", "shock", "stor forbraending", "svaer"],
    triggers: [
      { treeId: "burns-dk", nodeId: "fluid" },
      { treeId: "burns-dk", nodeId: "tbsa" },
      { field: "weight" },
    ],
  },
  {
    id: "electrical-myoglobinuria",
    title: {
      da: "Mørk urin efter elektrisk skade kan være myoglobinuri",
      en: "Dark urine after an electrical injury can be myoglobinuria",
    },
    consequence: {
      da: "Den synlige hudskade siger intet om vævshenfaldet under den.",
      en: "The visible skin injury says nothing about the tissue breakdown beneath it.",
    },
    alvor: "critical",
    fase: "resuscitation",
    query: "moerk urin myoglobinuri elektriske forbraendinger diurese",
    hints: ["elektrisk", "stroem", "hoejspaending", "lynned", "el-skade"],
    triggers: [
      { treeId: "burns-dk", nodeId: "mechanism", values: ["electrical"] },
      { field: "mechanism", values: ["electrical"] },
    ],
  },
  {
    id: "chemical-irrigation",
    title: {
      da: "Ætsning: forsinkelsen er faldgruben — skyl straks",
      en: "Chemical burn: the delay is the trap — irrigate immediately",
    },
    consequence: {
      da: "Varigheden er fagligt omdiskuteret. At vente på det rigtige skyllemiddel er ikke.",
      en: "The duration is debated. Waiting for the right irrigation fluid is not.",
    },
    alvor: "critical",
    fase: "resuscitation",
    query: "aetsning skylning saa hurtigt som muligt varighed kontroversiel diphoterine",
    hints: ["aetsning", "kemisk", "syre", "base", "flussyre", "diphoterine", "kalk", "cement"],
    triggers: [
      { treeId: "burns-dk", nodeId: "mechanism", values: ["chemical"] },
      { field: "mechanism", values: ["chemical"] },
    ],
  },
  {
    id: "dressing-untouched",
    title: {
      da: "Forbindingen skal ligge urørt — og må ikke stivne hånden",
      en: "The dressing stays untouched — and must not stiffen the hand",
    },
    consequence: {
      da: "Unødige skift forsinker helingen; en forbinding der låser fingrene giver stive led.",
      en: "Needless changes delay healing; a dressing that locks the fingers leaves stiff joints.",
    },
    alvor: "important",
    fase: "wound",
    query: "forbinding urørt 10 dage gennemsivning begraense bevaegelighed stive fingre",
    hints: ["forbind", "bandage", "mepilex", "haand", "finger", "indpakning", "jelonet"],
    triggers: [
      { treeId: "dressing-hand-arm" },
      { treeId: "burns-dk", dispositionId: "disp-treat" },
    ],
  },
  {
    id: "followup-deep-dermal",
    title: {
      da: "Kontrollen er dér dybden endelig afgøres",
      en: "The follow-up is where depth is finally settled",
    },
    consequence: {
      da: "Et sår der ved kontrollen vurderes dybt dermalt, skal videre — ikke pakkes ind igen.",
      en: "A wound judged deep dermal at follow-up must move on — not simply be re-dressed.",
    },
    alvor: "important",
    fase: "handover",
    query: "ambulant kontrol 10 dage dybe dermale henvises brandsaarsafdeling operation infektionstegn",
    hints: ["dyb dermal", "kontrol", "ambulant", "haand", "ansigt", "led", "genital", "fod", "heling"],
    triggers: [
      { treeId: "burns-dk", nodeId: "location" },
      { treeId: "burns-dk", dispositionId: "disp-treat" },
      { field: "location" },
    ],
  },
  {
    id: "thrombosis-anticoagulation",
    title: {
      da: "Brandsår tæller som posttraume i tromboserisikoen",
      en: "A burn counts as recent trauma in the thrombosis risk",
    },
    consequence: {
      da: "Patientens igangværende AK-behandling og risikoprofil hører med i vurderingen — også i skadestuen.",
      en: "The patient's ongoing anticoagulation and risk profile belong in the assessment — in the ED too.",
    },
    alvor: "important",
    fase: "history",
    query: "antikoagulationsbehandling trombosedisponerende posttraume inkl. brandsaar profylakse",
    hints: ["antikoagul", "blodfortynd", "trombose", "immobil", "indlaeg", "ak-behandling"],
    triggers: [
      { field: "anticoagulants", values: ["yes"] },
      { treeId: "burns-dk", dispositionId: "disp-refer" },
      { treeId: "burns-dk", dispositionId: "disp-emergency" },
    ],
  },
  {
    id: "transfer-handover",
    title: {
      da: "Overleveringen har en fast liste — hav den klar før du ringer",
      en: "The handover has a fixed list — have it ready before you call",
    },
    consequence: {
      da: "Vagthavende træffer beslutningen om overflytning på det du kan fremlægge i telefonen.",
      en: "The on-call surgeon decides on transfer from what you can present on the phone.",
    },
    alvor: "important",
    fase: "handover",
    query: "overflytning kontakt vagthavende skadesmekanisme skadestidspunkt vitale parametre areal",
    hints: ["overflyt", "henvis", "brandsaarscenter", "rigshospitalet", "svaer", "transport"],
    triggers: [
      { treeId: "burns-dk", dispositionId: "disp-refer" },
      { treeId: "burns-dk", dispositionId: "disp-emergency" },
      { field: "timeSince" },
    ],
  },
];

export interface FaldgrubeKontekst {
  treeId?: string | null;
  nodeId?: string | null;
  /** Svarværdier der er afgivet indtil nu. */
  values?: string[];
  dispositionId?: string | null;
  /** Anamnesefelter der er udfyldt (eller aktivt i fokus). */
  fields?: string[];
}

/** Er en af trækkerens værdier blandt dem der er svaret? */
function vaerdiRamt(t: Traekker, k: FaldgrubeKontekst): boolean {
  if (!t.values || t.values.length === 0) return true;
  return t.values.some((v) => (k.values ?? []).includes(v));
}

function passer(t: Traekker, k: FaldgrubeKontekst): boolean {
  /*
   * Anamnesefelter. Værdien tæller med når trækkeren nævner den: at
   * skadesmekanismen er UDFYLDT betyder ikke at den elektriske faldgrube
   * gælder — kun at mekanismen ER elektrisk gør. En advarsel der altid vises,
   * bliver ikke læst.
   */
  if (t.field) return (k.fields ?? []).includes(t.field) && vaerdiRamt(t, k);

  if (t.treeId && t.treeId !== k.treeId) return false;
  if (t.dispositionId) return t.dispositionId === k.dispositionId;
  if (t.nodeId && t.nodeId !== k.nodeId) return false;
  // Værdien kan være svaret på den node vi står på, eller et svar længere
  // tilbage i vejen — en cirkulær dyb forbrænding holder ikke op med at være
  // dyb fordi man er gået to spørgsmål videre.
  if (!vaerdiRamt(t, k)) return false;
  // En træ-trækker uden node gælder hele træet (procedureguiden).
  return true;
}

/** Hvilke faldgruber er relevante lige her? Mest alvorlige først. */
export function matchFaldgruber(k: FaldgrubeKontekst): Faldgrube[] {
  return FALDGRUBER.filter((f) => f.triggers.some((t) => passer(t, k))).sort((a, b) =>
    a.alvor === b.alvor ? 0 : a.alvor === "critical" ? -1 : 1,
  );
}

export function findFaldgrube(id: string): Faldgrube | undefined {
  return FALDGRUBER.find((f) => f.id === id);
}

/** Folder danske tegn, så et match ikke afhænger af stavemåde eller sprogtaster. */
function fold(s: string): string {
  return s.toLowerCase().replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa");
}

/**
 * Faldgruber der hører til et EMNE — behandlingsguidens indgang.
 *
 * Guiden har ingen node at hænge en trækker på; der er kun det lægen skrev og
 * de danske søgeord der kom ud af det. Vi matcher derfor på ord, ikke på
 * tilstand — og bevidst konservativt: rammer intet, vises intet. En guide uden
 * faldgruber er bedre end en guide med de forkerte.
 */
export function matchEmne(tekst: string, maks = 3): Faldgrube[] {
  const felt = fold(tekst);
  return FALDGRUBER.filter((f) => f.hints.some((h) => felt.includes(fold(h))))
    .sort((a, b) => (a.alvor === b.alvor ? 0 : a.alvor === "critical" ? -1 : 1))
    .slice(0, maks);
}

export const FASE_LABEL: Record<Fase, Record<Lang, string>> = {
  history: { da: "Anamnese", en: "History" },
  assessment: { da: "Vurdering", en: "Assessment" },
  resuscitation: { da: "Akut behandling", en: "Acute treatment" },
  wound: { da: "Sårbehandling", en: "Wound care" },
  handover: { da: "Henvisning og kontrol", en: "Referral and follow-up" },
};

export const FASE_ORDEN: Fase[] = ["history", "assessment", "resuscitation", "wound", "handover"];
