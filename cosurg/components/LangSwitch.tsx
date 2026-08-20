import type { Lang } from "@/lib/tree/types";
import { Flag } from "./Flag";

interface LangSwitchProps {
  lang: Lang;
  onToggleLang: () => void;
}

/**
 * Sprogvælgeren: dansk/engelsk flag, samme sted og udseende overalt i appen.
 * Kun to sprog findes, så et klik på det inaktive flag er det samme som at
 * toggle — det aktive flag gør ingenting, så et gentaget klik ikke slår
 * sproget frem og tilbage ved en fejlklikning.
 */
export function LangSwitch({ lang, onToggleLang }: LangSwitchProps) {
  return (
    <div
      role="group"
      aria-label={lang === "da" ? "Sprog" : "Language"}
      className="flex items-center gap-1 rounded-lg border bg-[var(--paper-raised)] p-0.5"
    >
      <button
        type="button"
        onClick={() => lang !== "da" && onToggleLang()}
        aria-pressed={lang === "da"}
        aria-label="Dansk"
        className={`flex items-center justify-center rounded-md p-1.5 transition-opacity ${
          lang === "da" ? "bg-[var(--teal-tint)] ring-1 ring-[var(--teal)]" : "opacity-50 hover:opacity-80"
        }`}
      >
        <Flag country="dk" size={22} />
      </button>
      <button
        type="button"
        onClick={() => lang !== "en" && onToggleLang()}
        aria-pressed={lang === "en"}
        aria-label="English"
        className={`flex items-center justify-center rounded-md p-1.5 transition-opacity ${
          lang === "en" ? "bg-[var(--teal-tint)] ring-1 ring-[var(--teal)]" : "opacity-50 hover:opacity-80"
        }`}
      >
        <Flag country="gb" size={22} />
      </button>
    </div>
  );
}
