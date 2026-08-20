/**
 * Generisk klinisk beslutningstræ. Motoren er tilstands-agnostisk: brandsår er blot
 * det første træ. Alt klinisk indhold lever i JSON, aldrig i kode.
 */

export type Lang = "da" | "en";
export type LocalizedText = Record<Lang, string>;

export type AnswerType = "boolean" | "choice" | "number";

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
  /** Hvor går vi hen bagefter. Første match vinder; "*" matcher alt. */
  edges: TreeEdge[];
}

export interface RedFlag {
  /** Svarværdi der udløser flaget, eller "*" for altid ved denne node. */
  when: string;
  message: LocalizedText;
  /** Hop direkte til denne node/disposition når flaget rammes. */
  goto?: string;
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
