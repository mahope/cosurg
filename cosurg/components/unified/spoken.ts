import type { ChatAnswer } from "@/lib/corti/chat";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";

/**
 * Hvad der læses HØJT af et kildebelagt svar.
 *
 * Hele svaret oplæst er ubrugeligt når hænderne er optaget: agenten skriver
 * punktopstillinger og kildehenvisninger, og dem kan man ikke lytte sig igennem.
 * Vi læser derfor det korte resumé agenten selv har skrevet, og siger hvor mange
 * kilder det hviler på — for et svar uden kilder skal man handle anderledes på.
 *
 * Funktionerne bor her frem for i chat-visningen, fordi de nu bruges to steder:
 * i det samlede forløb (`app/page.tsx`) og på den selvstændige chatside.
 */

/** TTS afregnes pr. tegn og /api/tts klipper ved 500 — vi klipper selv, ved en sætning. */
const SPOKEN_LIMIT = 380;

export function clipToSentence(text: string, limit: number = SPOKEN_LIMIT): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const stop = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"));
  return stop > limit * 0.5 ? cut.slice(0, stop + 1) : `${cut.trimEnd()}…`;
}

/** Det korte resumé, og hvor mange kilder det hviler på. */
export function spokenText(answer: ChatAnswer, lang: Lang): string {
  const base = answer.spokenSummary ?? answer.answer.replace(/[*#`]/g, "");
  const body = clipToSentence(base.trim());
  if (answer.sources.length === 0) {
    return `${body} ${tr("chatUnsupportedNote", lang)}`;
  }
  const tail =
    lang === "da"
      ? `Baseret på ${answer.sources.length} ${answer.sources.length === 1 ? "kilde" : "kilder"}.`
      : `Based on ${answer.sources.length} ${answer.sources.length === 1 ? "source" : "sources"}.`;
  return `${body} ${tail}`;
}
