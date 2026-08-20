"use client";

import { useEffect, useRef, useState } from "react";
import type { Lang, LocalizedText } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";

export interface TreeSummary {
  id: string;
  name: LocalizedText;
  version: string;
  authors?: string[];
}

interface TreePickerProps {
  lang: Lang;
  trees: TreeSummary[];
  activeId: string;
  activeName: string;
  activeVersion: string;
  busy: boolean;
  onSelect: (id: string) => void;
}

/**
 * Træ-vælgeren er diskret med vilje: i normaltilstand er den blot navnet på det
 * aktive træ, sat som en lille knap dér hvor navnet alligevel stod. Klinikeren
 * skal ikke vælge motor — han skal se hvilket træ der kører.
 *
 * Til pitchen er den til gengæld beviset: motoren er tilstands-agnostisk, og et
 * nyt træ er en JSON-fil, ikke en ny app. Derfor står forfatterne på hvert træ i
 * listen — indholdet er klinikernes, koden er kun ledningsnettet.
 */
export function TreePicker({
  lang,
  trees,
  activeId,
  activeName,
  activeVersion,
  busy,
  onSelect,
}: TreePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const multiple = trees.length > 1;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => multiple && setOpen((v) => !v)}
        disabled={!multiple || busy}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={tr("switchTree", lang)}
        className="group flex items-center gap-1.5 rounded-md px-1.5 py-0.5 -ml-1.5 font-[family-name:var(--font-mono)] text-xs text-[var(--ink-faint)] transition-colors enabled:hover:bg-[var(--teal-tint)] enabled:hover:text-[var(--teal-deep)] disabled:cursor-default"
      >
        <span className="truncate">
          {activeName} · v{activeVersion}
        </span>
        {multiple && (
          <svg viewBox="0 0 12 12" width="10" height="10" fill="none" aria-hidden="true" className="shrink-0">
            <path
              d="M3 4.5 6 7.5 9 4.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--paper-raised)] shadow-[0_12px_32px_rgba(0,83,85,0.14)]"
        >
          <p className="border-b border-[var(--line)] px-3 py-2 font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            {tr("tree", lang)}
          </p>
          <ul>
            {trees.map((t) => {
              const active = t.id === activeId;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setOpen(false);
                      if (!active) onSelect(t.id);
                    }}
                    className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-[var(--teal-tint)] ${
                      active ? "bg-[var(--teal-tint)]" : ""
                    }`}
                  >
                    <span className="flex w-full items-center gap-2">
                      <span className="text-sm font-medium text-[var(--ink)]">{t.name[lang]}</span>
                      {active && (
                        <span className="ml-auto font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--teal-deep)]">
                          ●
                        </span>
                      )}
                    </span>
                    <span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--ink-faint)]">
                      v{t.version}
                    </span>
                    {t.authors && t.authors.length > 0 && (
                      <span className="line-clamp-2 text-[11px] leading-snug text-[var(--ink-soft)]">
                        {t.authors[0]}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="border-t border-[var(--line)] bg-[var(--nude-tint)] px-3 py-2 text-[11px] leading-snug text-[var(--ink-soft)]">
            {tr("engineNote", lang)}
          </p>
        </div>
      )}
    </div>
  );
}
