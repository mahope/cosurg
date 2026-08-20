/**
 * Tastaturgenvejene — ét sted.
 *
 * Genvejene bor her og ikke spredt i hver komponent, fordi de skal kunne
 * VISES: tooltippen på knappen, genvejsoversigten og lytteren i page.tsx skal
 * alle sige det samme. Står tasten tre steder, bliver den forkert to af dem.
 *
 * HVORFOR ALT OG IKKE BARE ET BOGSTAV.
 *
 * Skrivefeltet har `autoFocus` — det er hele produktet, og markøren står
 * derfor i det fra det sekund siden åbner. Et bart «m» ville dermed enten
 * blive skrevet i feltet (og genvejen findes reelt ikke) eller stjæle
 * bogstavet ud af «mand med brandsår» (og så er den direkte skadelig). Alt +
 * tast har ingen af de to problemer: den virker OVERALT, også midt i en
 * sætning, og der er ingen undtagelse at forklare.
 *
 * Ctrl og Cmd er bevidst fravalgt — dér bor browserens egne (Ctrl+F, Ctrl+L,
 * Cmd+T), og en klinisk app må ikke kapre dem.
 *
 * Bogstavet skal kunne huskes på begge sprog: (M)ikrofon/microphone,
 * (H)åndfri/handsfree, (N)y/new, (S)prog/speech language, (F)elt/field,
 * (K)ortkommandoer/keyboard.
 */

/** Skrivefeltets id — genvejens håndtag ned i IntakeCard. */
export const INTAKE_FIELD_ID = "intake-field";

/**
 * Der matches på `code` og ikke på `key`.
 *
 * `key` er tastaturlayoutets tegn: på macOS gør Alt+M ordet til «µ», og på et
 * dansk layout flytter flere tegn sig i forhold til et engelsk. `code` er den
 * fysiske tast og er ens overalt — genvejen virker derfor også for den
 * kirurg der sidder ved en Mac med dansk tastatur.
 */
export const SHORTCUT_KEYS = {
  focusField: { code: "KeyF", label: "F" },
  mic: { code: "KeyM", label: "M" },
  handsfree: { code: "KeyH", label: "H" },
  newSession: { code: "KeyN", label: "N" },
  lang: { code: "KeyS", label: "S" },
  help: { code: "KeyK", label: "K" },
} as const;

/** Modifikatorens navn på tastekapslen. Ét sted, så det ikke staves to. */
export const ALT = "Alt";

/** Tastekapslerne til en tooltip: `Alt` + bogstavet. */
export function combo(key: { label: string }): string[] {
  return [ALT, key.label];
}

/**
 * «?» åbner også oversigten — det er konventionen, og den skal ikke opfindes
 * på ny. Den virker kun når der ikke skrives, for «?» er et rigtigt tegn.
 */
export const HELP_CHAR = "?";

/**
 * Skriver brugeren lige nu?
 *
 * Bruges til det ene sted hvor en genvej IKKE må gribe ind: den bare «?».
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== "string") return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable === true;
}

/**
 * Sæt markøren i skrivefeltet.
 *
 * Feltet slås op i DOM'en frem for at blive rakt igennem som en ref: der er
 * to udgaver af IntakeCard (indgangsskærmen og komposeren), aldrig begge på
 * én gang, og et id holder genvejen uafhængig af hvilken af dem der står.
 *
 * Returnerer om feltet faktisk blev fundet, så den der kalder kan lade være
 * med at æde tastetrykket når der ikke er noget felt at gå til.
 */
export function focusIntakeField(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.getElementById(INTAKE_FIELD_ID) as HTMLTextAreaElement | null;
  if (!el) return false;
  el.focus();
  // Markøren i enden af det der allerede står — ikke oven i det.
  const end = el.value.length;
  el.setSelectionRange(end, end);
  return true;
}
