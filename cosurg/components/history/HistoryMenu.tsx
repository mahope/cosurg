"use client";

import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { listConversations } from "@/lib/history";
import { Tooltip } from "@/components/ui/Tooltip";
import { SizeLock, widestOf } from "@/components/ui/SizeLock";

interface HistoryMenuProps {
  lang: Lang;
  /** Åbn en gemt samtale direkte — ét klik fra instrumentpanelet. */
  onOpen: (id: string) => void;
  /** Åbn det fulde historikpanel (slet, ryd, hele listen). */
  onShowAll: () => void;
}

/** Ur-med-pil-ikonet — konventionen for historik. Delt af begge knapudgaver. */
export function HistoryIcon({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} fill="none" aria-hidden="true">
      <path d="M4.5 5.5A6.5 6.5 0 1 1 3.5 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4.5 2.5v3h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 7v3.2l2.3 1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * HISTORIK-KNAPPEN PÅ DESKTOP: en tydelig knap med de seneste samtaler i en
 * dropdown — ét klik åbner en samtale igen, "Vis alle" åbner det fulde panel.
 *
 * En dropdown og ikke bare panelet, fordi det hyppige ærinde er "den samtale
 * jeg lige havde" — den skal ligge ét klik væk, ikke bag en dialog med
 * sletteknapper. Panelet beholder forvaltningen (slet, ryd, følsomhedsnote).
 */
export function HistoryMenu({ lang, onOpen, onShowAll }: HistoryMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // Listen læses ved render mens dropdownen er åben — aldrig i en effekt, og
  // altid frisk: en anden fane kan have gemt siden sidst.
  const items = open ? listConversations().slice(0, 5) : [];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const dateFormat = new Intl.DateTimeFormat(lang === "da" ? "da-DK" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div ref={rootRef} className="relative inline-flex">
      <Tooltip label={tr("historyTitle", lang)} placement="bottom-end">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--line-strong)] bg-[var(--paper-raised)] px-3.5 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)]"
        >
          <HistoryIcon />
          <SizeLock variants={widestOf("historyButton")}>{tr("historyButton", lang)}</SizeLock>
        </button>
      </Tooltip>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-[var(--line)] bg-[var(--paper-raised)] p-2 text-left shadow-[var(--shadow-lifted)]">
          <p className="px-2 pb-1 pt-1.5 font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            {tr("historyTitle", lang)}
          </p>
          {items.length === 0 ? (
            <p className="px-2 pb-2 text-[13px] leading-relaxed text-[var(--ink-soft)]">
              {tr("historyEmpty", lang)}
            </p>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onOpen(item.id);
                    }}
                    className="w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-[var(--teal-tint)]"
                  >
                    <span className="block truncate text-sm font-medium leading-snug text-[var(--ink)]">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block font-[family-name:var(--font-mono)] text-[11px] text-[var(--ink-faint)]">
                      {dateFormat.format(new Date(item.updatedAt))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onShowAll();
            }}
            className="mt-1 w-full rounded-lg border-t border-[var(--line)] px-2 py-2 text-left text-sm font-medium text-[var(--teal-deep)] transition-colors hover:bg-[var(--teal-tint)]"
          >
            {tr("historyShowAll", lang)}
          </button>
        </div>
      )}
    </div>
  );
}
