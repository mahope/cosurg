/**
 * Indlaesning og opslag i beslutningstraeerne.
 *
 * Traeerne er CoSurgs deterministiske klinik: anbefalingen kommer fra traeet,
 * aldrig fra en sprogmodel. Denne server udstiller dem uaendret — vi
 * omskriver, sammenfatter eller "forbedrer" ikke noderne undervejs.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";

import { foersteEksisterende, konfiguration } from "./konfiguration.js";

export type Sprog = "da" | "en";

export interface Tekstpar {
  da?: string;
  en?: string;
  [andet: string]: string | undefined;
}

export interface Valgmulighed {
  value: string;
  label?: Tekstpar;
  synonyms?: { da?: string[]; en?: string[] };
  [andet: string]: unknown;
}

export interface Kant {
  when: string;
  goto?: string;
  disposition?: string;
  [andet: string]: unknown;
}

export interface Node {
  id: string;
  question?: Tekstpar;
  orQuestion?: Tekstpar;
  answerType?: string;
  options?: Valgmulighed[];
  edges?: Kant[];
  redFlags?: unknown[];
  help?: Tekstpar;
  images?: { src: string; caption?: Tekstpar }[];
  unit?: string;
  min?: number;
  max?: number;
  [andet: string]: unknown;
}

export interface Disposition {
  id: string;
  severity?: string;
  title?: Tekstpar;
  guidance?: Tekstpar;
  sources?: string[];
  [andet: string]: unknown;
}

export interface Trae {
  id: string;
  version?: string;
  name?: Tekstpar;
  description?: Tekstpar;
  authors?: string[];
  rootNodeId?: string;
  nodes: Node[];
  dispositions?: Disposition[];
  /** Filnavnet traeet blev laest fra — kildehenvisningen for traeindhold. */
  _fil: string;
}

export interface Traesamling {
  traeer: Trae[];
  mappe: string | null;
  fejl: { fil: string; besked: string }[];
}

export function indlaesTraeer(): Traesamling {
  const mappe = foersteEksisterende(konfiguration.traeMapper);
  if (mappe === null) return { traeer: [], mappe: null, fejl: [] };

  const traeer: Trae[] = [];
  const fejl: { fil: string; besked: string }[] = [];

  for (const fil of readdirSync(mappe).filter((f) => f.toLowerCase().endsWith(".json")).sort()) {
    const sti = join(mappe, fil);
    if (!statSync(sti).isFile()) continue;
    try {
      const raa = JSON.parse(readFileSync(sti, "utf8")) as Partial<Trae>;
      if (typeof raa.id !== "string" || !Array.isArray(raa.nodes)) {
        fejl.push({ fil, besked: "Mangler 'id' eller 'nodes' — springes over." });
        continue;
      }
      traeer.push({ ...(raa as Trae), _fil: basename(sti) });
    } catch (e) {
      fejl.push({ fil, besked: e instanceof Error ? e.message : String(e) });
    }
  }

  return { traeer, mappe, fejl };
}

/** Vaelger sprogvariant med dansk som fallback — en node uden tekst er en fejl, ikke et tomt svar. */
export function tekst(par: Tekstpar | undefined, sprog: Sprog): string | null {
  if (!par) return null;
  return par[sprog] ?? par.da ?? par.en ?? null;
}

export function findTrae(samling: Traesamling, id: string): Trae | null {
  return samling.traeer.find((t) => t.id === id) ?? null;
}

export function findNode(trae: Trae, id: string): Node | null {
  return trae.nodes.find((n) => n.id === id) ?? null;
}

export function findDisposition(trae: Trae, id: string): Disposition | null {
  return trae.dispositions?.find((d) => d.id === id) ?? null;
}

/** Alle node-id'er der peger paa den givne node — bruges til at vise vejen ind. */
export function forgaengere(trae: Trae, nodeId: string): { fra: string; when: string }[] {
  const ud: { fra: string; when: string }[] = [];
  for (const n of trae.nodes) {
    for (const k of n.edges ?? []) {
      if (k.goto === nodeId) ud.push({ fra: n.id, when: k.when });
    }
  }
  return ud;
}
