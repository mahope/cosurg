/**
 * Generisk klinisk beslutningstræ. Motoren er tilstands-agnostisk: brandsår er blot
 * det første træ. Alt klinisk indhold lever i JSON, aldrig i kode.
 */

export type Lang = "da" | "en";
export type LocalizedText = Record<Lang, string>;

/**
 * "step" er en instruktion frem for et spørgsmål: den har intet svar, vises med
 * billeder og kvitteres blot med "næste". Det er den samme motor der driver både
 * beslutningstræer og procedureguider.
 */
export type AnswerType = "boolean" | "choice" | "number" | "step";

export interface AnswerOption {
  /** Maskin-værdi der matches i kanter. */
  value: string;
  label: LocalizedText;
  /** Ord/vendinger der peger på dette valg — hjælper agentens fortolkning. */
  synonyms?: Partial<Record<Lang, string[]>>;
}

export interface StepImage {
  /** Sti under /public, fx "/step-images/image12.png" */
  src: string;
  caption?: LocalizedText;
}

/**
 * Ét forud-formuleret opslag i vidensbasen.
 *
 * Lægen skal kunne bede om mere uden at opfinde et spørgsmål. Emnet kender vi
 * allerede — det er noden, det røde flag eller dispositionen han står i — så
 * ordlyden skrives HER, sammen med det kliniske indhold, og ikke i koden.
 */
export interface SourceLookup {
  /** Grebets ordlyd, fx "Hvad siger kilderne om cirkulær forbrænding?" */
  label: LocalizedText;
  /** Spørgsmålet der faktisk sendes afsted. */
  question: LocalizedText;
}

/**
 * Hvornår et handlingstrin gælder. Matches mod den sti motoren faktisk gik —
 * aldrig mod fritekst, så et trin ikke kan komme frem på en formodning.
 */
export interface EscalationWhen {
  nodeId: string;
  /** Svarværdier der udløser trinnet. Udeladt = enhver værdi på noden. */
  values?: string[];
  /** Tal-node: trinnet gælder fra og med denne værdi. */
  atLeast?: number;
}

/**
 * Ét konkret handlingstrin ved en eskalation.
 *
 * `detail` er en TRO omskrivning af kilden, aldrig et selvstændigt klinisk
 * udsagn — præcis som faldgrubernes overskrifter. Selve belægget hentes ordret
 * fra vidensbasen med `query` og vises ved siden af. Kan vidensbasen ikke
 * belægge trinnet, siger kortet det; `source` står der under alle omstændigheder,
 * så et trin aldrig kan stå uden afsender.
 */
export interface EscalationAction {
  id: string;
  /** Udeladt = trinnet gælder uanset hvordan gennemløbet faldt ud. */
  when?: EscalationWhen[];
  title: LocalizedText;
  detail: LocalizedText;
  /** Instruksen trinnet er skrevet efter. */
  source: string;
  /** Søgningen der henter det ordrette belæg. Danske ord — kilderne er danske. */
  query: string;
}

/**
 * Eskalationen set fra BEGGE sider.
 *
 * "Ring til vagthavende brandsårslæge" er rigtigt for den yngre læge og
 * cirkulært for specialisten, der ER den vagthavende. Et råd der antager den
 * ene rolle, svigter den anden præcis når det gælder mest — så teksten rummer
 * dem begge, og handlingstrinnene er de samme for dem begge.
 */
export interface Escalation {
  /** Rollen der ringer op. Telefonnummeret bliver stående her. */
  calling: LocalizedText;
  /** Rollen der bliver ringet TIL: der er ingen at ringe til, beslutningen er hendes. */
  receiving: LocalizedText;
  actions: EscalationAction[];
}

export interface TreeNode {
  id: string;
  question: LocalizedText;
  /** Kort, imperativ formulering brugt i OR-tilstand. Falder tilbage til question. */
  orQuestion?: LocalizedText;
  answerType: AnswerType;
  options?: AnswerOption[];
  /** Kun for answerType "number". */
  unit?: string;
  min?: number;
  max?: number;
  /** Hjælpetekst vist på skærmen (aldrig læst op). */
  help?: LocalizedText;
  /** Billeder der viser hvad der konkret skal gøres — vises stort i OR-tilstand. */
  images?: StepImage[];
  /** Kritisk node: rammes en af disse værdier, afbrydes flowet med rødt flag. */
  redFlags?: RedFlag[];
  /** Forud-formuleret opslag: "hvad siger kilderne om det her spørgsmål?" */
  lookup?: SourceLookup;
  /** Hvor går vi hen bagefter. Første match vinder; "*" matcher alt. */
  edges: TreeEdge[];
}

export interface RedFlag {
  /** Svarværdi der udløser flaget, eller "*" for altid ved denne node. */
  when: string;
  message: LocalizedText;
  /** Hop direkte til denne node/disposition når flaget rammes. */
  goto?: string;
  /** Forud-formuleret opslag om netop dette flag. Overtrumfer nodens egen. */
  lookup?: SourceLookup;
}

export interface TreeEdge {
  /** Svarværdi, "*", eller et simpelt taludtryk: ">=20", "<10", "10-19". */
  when: string;
  goto: string;
}

export interface Disposition {
  id: string;
  title: LocalizedText;
  /** Handlingsanvisning — det der læses op til sidst. */
  guidance: LocalizedText;
  severity: "home" | "treat" | "refer" | "emergency";
  images?: StepImage[];
  /** Kildehenvisninger, fx "brandsaar.dk/vaeskebehandling". */
  sources?: string[];
  /**
   * Hvad man gør imens — og hvad man gør hvis man selv er den der bliver
   * ringet til. Sat på de dispositioner der eskalerer.
   */
  escalation?: Escalation;
  /** Forud-formuleret opslag om anbefalingen. */
  lookup?: SourceLookup;
}

export interface DecisionTree {
  id: string;
  name: LocalizedText;
  description?: LocalizedText;
  version: string;
  /** Fagpersoner der har skrevet/godkendt træet — vises i UI som transparens. */
  authors?: string[];
  rootNodeId: string;
  nodes: TreeNode[];
  dispositions: Disposition[];
}

/** Ét besvaret trin i et gennemløb. */
export interface AnsweredStep {
  nodeId: string;
  question: string;
  rawAnswer: string;
  value: string;
  redFlagged?: string;
}

export interface SessionState {
  treeId: string;
  lang: Lang;
  currentNodeId: string | null;
  path: AnsweredStep[];
  dispositionId: string | null;
  redFlags: string[];
}
