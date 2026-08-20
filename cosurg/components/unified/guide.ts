import type { KildeUddrag } from "@/lib/corti/mcp";
import type { Lang } from "@/lib/tree/types";

/**
 * Behandlingsguiden set fra det samlede forløb.
 *
 * Formen er den samme som `/api/guide` svarer med. Den er skrevet ud her frem
 * for importeret fra rutefilen, så en klientkomponent aldrig kommer til at
 * trække serverkode — MCP-klient, Corti-auth — med ind i browser-bundtet.
 */

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
 * Guiden oversætter først emnet med en agent og slår derefter op syv-otte
 * gange i vidensbasen. Fristen er sat derefter — og den findes, så et opslag
 * mod et dødt net giver op frem for at stå og hente for evigt.
 */
export const TIMEOUT_GUIDE = 45_000;

/** Et emne er en tilstand, ikke et essay. Ruten klipper ved samme længde. */
const MAX_TOPIC = 160;

export async function fetchGuide(topic: string, lang: Lang): Promise<GuideSvar> {
  const res = await fetch("/api/guide", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic: topic.slice(0, MAX_TOPIC), lang }),
    signal: AbortSignal.timeout(TIMEOUT_GUIDE),
  });
  const data = (await res.json()) as GuideSvar & { error?: string };
  if (data.error) throw new Error(data.error);
  return data;
}
