import type { KildeUddrag } from "@/lib/corti/mcp";
import type { Daekning } from "@/components/pitfalls/types";

/**
 * Eskalationen som klienten ser den.
 *
 * Typen bor her og ikke i API-ruten, så komponenten kan bruge den uden at
 * trække serverkode med ind i bundtet — samme greb som faldgrubernes typer.
 */

/** Ét handlingstrin med det belæg vidensbasen kunne give det. */
export interface LoestHandling {
  id: string;
  /** Vores overskrift — en tro omskrivning af instruksen, aldrig et selvstændigt udsagn. */
  title: string;
  detail: string;
  /** Instruksen trinnet er skrevet efter. Står der ALTID, også uden dækning. */
  source: string;
  evidence: KildeUddrag | null;
  coverage: Daekning;
}

/** De to roller en eskalation kan læses fra. Begge vises, altid. */
export interface EskalationsRoller {
  /** Du ringer op. Telefonnummeret står her. */
  calling: string;
  /** Du ER den der bliver ringet til. */
  receiving: string;
}

export interface EskalationSvar {
  treeId: string;
  roles: EskalationsRoller | null;
  actions: LoestHandling[];
  /** Det forud-formulerede opslag, hvis træet har et til dette sted. */
  lookup: { label: string; question: string } | null;
}
