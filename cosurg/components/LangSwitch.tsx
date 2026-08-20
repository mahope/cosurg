import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { Flag } from "./Flag";
import { Tooltip } from "./ui/Tooltip";
import { combo, SHORTCUT_KEYS } from "./shortcuts";

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
      {/* Tooltippen siger hvad skiftet RÆKKER: både skærmen og talen følger
          med. Et flag alene lover kun det første. */}
      <Tooltip label={tr("tipLang", lang)} keys={combo(SHORTCUT_KEYS.lang)} placement="bottom-start">
        <button
          type="button"
          onClick={() => lang !== "da" && onToggleLang()}
          aria-pressed={lang === "da"}
          aria-label="Dansk"
          /* 40 px høj og 44 px bred inkl. båndets egen padding: flagene rammes
             med en tommelfinger, ikke med en musemarkør. */
          className={`flex h-10 w-10 items-center justify-center rounded-md transition-opacity ${
            lang === "da" ? "bg-[var(--teal-tint)] ring-1 ring-[var(--teal)]" : "opacity-50 hover:opacity-80"
          }`}
        >
          <Flag country="dk" size={22} />
        </button>
      </Tooltip>
      <Tooltip label={tr("tipLang", lang)} keys={combo(SHORTCUT_KEYS.lang)} placement="bottom-start">
        <button
          type="button"
          onClick={() => lang !== "en" && onToggleLang()}
          aria-pressed={lang === "en"}
          aria-label="English"
          /* 40 px høj og 44 px bred inkl. båndets egen padding: flagene rammes
             med en tommelfinger, ikke med en musemarkør. */
          className={`flex h-10 w-10 items-center justify-center rounded-md transition-opacity ${
            lang === "en" ? "bg-[var(--teal-tint)] ring-1 ring-[var(--teal)]" : "opacity-50 hover:opacity-80"
          }`}
        >
          <Flag country="gb" size={22} />
        </button>
      </Tooltip>
    </div>
  );
}
