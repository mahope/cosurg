import type { Lang } from "@/lib/tree/types";

/**
 * Menneskelige navne på Cortis registry-eksperter.
 *
 * Listen er ikke en hvidliste: står en connector ikke her — fx teamets egen
 * MCP-server når den kobles på — vises dens rå navn i stedet. Så kan UI'et
 * aldrig komme til at fortie en kilde det ikke kender.
 */
const LABELS: Record<string, Record<Lang, string>> = {
  // Teamets egen MCP-server med brandsaar.dk og PlastSurgeon-materialet.
  "cosurg-viden": { da: "CoSurg-vidensbasen", en: "CoSurg knowledge base" },
  "pubmed-expert": { da: "PubMed", en: "PubMed" },
  "web-search-expert": { da: "Websøgning", en: "Web search" },
  "medical-calculator-expert": { da: "Medicinsk beregner", en: "Medical calculator" },
  "clinical-trials-expert": { da: "Kliniske forsøg", en: "Clinical trials" },
  "coding-expert": { da: "Medicinsk kodning", en: "Medical coding" },
  "drugbank-expert": { da: "DrugBank", en: "DrugBank" },
  "posos-expert": { da: "POSOS", en: "POSOS" },
};

export function expertLabel(name: string, lang: Lang): string {
  return LABELS[name]?.[lang] ?? name;
}

/** "Calling expert: pubmed-expert" → "Søger i PubMed…" */
export function progressLabel(expert: string | null, raw: string, lang: Lang): string {
  if (!expert) return raw;
  const label = expertLabel(expert, lang);
  return lang === "da" ? `Søger i ${label}…` : `Searching ${label}…`;
}
