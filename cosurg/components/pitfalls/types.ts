import type { KildeUddrag } from "@/lib/corti/mcp";
import type { Faldgrube } from "./catalog";

/**
 * En faldgrube som den ser ud NÅR belægget er hentet.
 *
 * Typen bor her og ikke i API-ruten, så både serveren og klienten kan bruge den
 * uden at klienten kommer til at trække serverkode med sig ind i bundtet.
 */

/** Kunne vidensbasen belægge faldgruben? De tre svar betyder noget forskelligt. */
export type Daekning =
  /** Ja — `evidence` er et ordret uddrag med kilde. */
  | "ok"
  /** Nej — vores kilder dækker ikke emnet. Et gyldigt svar, ikke en fejl. */
  | "none"
  /** Vi kunne ikke spørge. Det er IKKE det samme som at der ingen dækning er. */
  | "error";

export interface LoestFaldgrube {
  id: string;
  title: Faldgrube["title"];
  consequence: Faldgrube["consequence"];
  alvor: Faldgrube["alvor"];
  fase: Faldgrube["fase"];
  evidence: KildeUddrag | null;
  coverage: Daekning;
}
