import type { Lang } from "@/lib/tree/types";
import type { Turn, WorkupState } from "@/components/chat/useClinicalChat";

/**
 * SAMTALEHISTORIKKEN — lagringslaget.
 *
 * Samtaler gemmes automatisk mens lægen arbejder, så en lukket fane eller en
 * genindlæst side aldrig koster en udredning. Lige nu bor de i browserens
 * localStorage — KUN lokalt på maskinen, aldrig på en server.
 *
 * DESIGNET TIL AT BLIVE SKIFTET UD: alt UI går gennem de fem funktioner
 * herunder (list/load/save/delete/clear) og kender intet til localStorage.
 * Den dag historikken skal følge en BRUGER i stedet for en browser, skrives
 * dette modul om til at kalde en server — og ingen komponent skal røres.
 *
 * Hvorfor localStorage og ikke IndexedDB: en samtale er ren tekst. Billeder
 * rejser med spørgsmålet til API'et men gemmes aldrig i turen (se
 * components/attachments.ts), så selv en lang samtale er få kilobyte.
 * Skulle kvoten alligevel rammes, smides de ældste samtaler før vi giver op —
 * historikken må aldrig kunne vælte selve samtalen.
 */

export interface SavedConversation {
  id: string;
  /** Første ytring, afkortet — det navn lægen genkender samtalen på. */
  title: string;
  lang: Lang;
  createdAt: number;
  updatedAt: number;
  /**
   * Cortis tråd-id. Gemmes med, så en genoptaget samtale kan fortsætte i
   * samme kontekst — og er den udløbet hos Corti, opdager useClinicalChat
   * det selv på tidsstemplet og sender et resumé med (recap).
   */
  contextId?: string;
  /**
   * Udredningens tilstand (treeId, path, pending). SKAL med: uden den ville
   * en genoptaget udredning begynde forfra ved træets rod, og det ligner
   * datatab for den der lige har svaret på fem spørgsmål.
   */
  workup?: WorkupState;
  turns: Turn[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: number;
  turnCount: number;
}

const KEY = "cosurg.history.v1";
const MAX_CONVERSATIONS = 50;
const TITLE_MAX = 64;

/** Kan der overhovedet gemmes her? (SSR og private vinduer uden kvote.) */
function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readAll(): SavedConversation[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c): c is SavedConversation =>
        !!c && typeof c === "object" && typeof (c as SavedConversation).id === "string" && Array.isArray((c as SavedConversation).turns),
    );
  } catch {
    // Ødelagt indhold må aldrig vælte appen — en tom historik er bedre.
    return [];
  }
}

function writeAll(all: SavedConversation[]): void {
  const store = storage();
  if (!store) return;
  // Nyeste først, og et loft: en historik uden loft vokser til den rammer
  // kvoten på det værst tænkelige tidspunkt.
  const sorted = [...all].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CONVERSATIONS);
  for (let keep = sorted.length; keep >= 0; keep--) {
    try {
      store.setItem(KEY, JSON.stringify(sorted.slice(0, keep)));
      return;
    } catch {
      // Kvoten er ramt. Smid den ældste og prøv igen — og giv i sidste ende
      // op i stilhed: historikken er en bekvemmelighed, samtalen er produktet.
    }
  }
}

/**
 * En gemt tur er altid FÆRDIG. Fremdriftslinjerne var live-status fra et kald
 * der ikke længere kører, og `done: false` ville få en genåbnet samtale til at
 * stå med en evig spinner over en tur der for længst er landet.
 *
 * Billedminiaturerne ryger også. De er data-URL'er på titusinder af tegn, og
 * localStorage har få megabyte til FEMTEN samtaler — et par fototure ville
 * æde kvoten og få writeAll til at smide ældre samtaler væk for at få plads.
 * Miniaturen lever i sessionen, hvor den hører til; historikken bærer ordene.
 * Billedanalysens observationer bliver derimod stående — de er tekst, og de er
 * det klinisk brugbare ved fotoet.
 */
function sanitizeTurn(turn: Turn): Turn {
  const { images, ...rest } = turn;
  void images;
  return { ...rest, progress: [], done: true };
}

/** Titlen er første ytring, klippet ved et ordskel så den ikke ender midt i et ord. */
export function conversationTitle(firstQuestion: string): string {
  const text = firstQuestion.trim().replace(/\s+/g, " ");
  if (text.length <= TITLE_MAX) return text;
  const cut = text.slice(0, TITLE_MAX);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > TITLE_MAX / 2 ? lastSpace : TITLE_MAX)}…`;
}

export function newConversationId(): string {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Alle gemte samtaler, nyeste først. Kun det listen skal bruge — aldrig turene. */
export function listConversations(): ConversationSummary[] {
  return readAll()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((c) => ({ id: c.id, title: c.title, updatedAt: c.updatedAt, turnCount: c.turns.length }));
}

export function loadConversation(id: string): SavedConversation | null {
  const found = readAll().find((c) => c.id === id);
  if (!found) return null;
  return { ...found, turns: found.turns.map(sanitizeTurn) };
}

/**
 * Gem (eller opdatér) en samtale. `createdAt` fra første gemning bevares, så
 * en samtale ikke "bliver yngre" af at blive skrevet videre.
 */
export function saveConversation(conv: Omit<SavedConversation, "createdAt" | "updatedAt">): void {
  if (conv.turns.length === 0) return;
  const all = readAll();
  const existing = all.find((c) => c.id === conv.id);
  const now = Date.now();
  const next: SavedConversation = {
    ...conv,
    turns: conv.turns.map(sanitizeTurn),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  writeAll([...all.filter((c) => c.id !== conv.id), next]);
}

export function deleteConversation(id: string): void {
  writeAll(readAll().filter((c) => c.id !== id));
}

export function clearConversations(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(KEY);
  } catch {
    // Ingen adgang — så var der heller intet gemt.
  }
}
