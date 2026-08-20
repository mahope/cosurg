"use client";

import { useEffect, useRef } from "react";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { Kbd } from "./ui/Tooltip";
import { ALT, HELP_CHAR, SHORTCUT_KEYS } from "./shortcuts";

interface ShortcutsDialogProps {
  lang: Lang;
  open: boolean;
  onClose: () => void;
}

/**
 * En linje i oversigten. `sep` er «+» når tasterne trykkes samtidig og «/»
 * når de er alternativer til hinanden — mellemrum ELLER højrepil.
 */
type Row = { keys: string[]; what: string; sep?: "+" | "/" };

function Group({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section className="mt-5 first:mt-0">
      <h3 className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
        {title}
      </h3>
      <ul className="mt-2">
        {rows.map((row) => (
          <li
            key={row.what}
            className="flex items-baseline justify-between gap-6 border-t border-[var(--line)] py-2 first:border-t-0"
          >
            <span className="text-sm leading-snug text-[var(--ink)]">{row.what}</span>
            <span className="flex shrink-0 items-center gap-1">
              {row.keys.map((k, i) => (
                <span key={`${k}-${i}`} className="flex items-center gap-1">
                  {i > 0 && <span className="text-[11px] text-[var(--ink-faint)]">{row.sep ?? "+"}</span>}
                  <Kbd>{k}</Kbd>
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Genvejsoversigten.
 *
 * Den findes fordi en genvej ingen kender ikke er en genvej. «?» er
 * konventionen for netop dette panel, og den koster ingen plads på skærmen:
 * lægen møder den én gang, og resten af appen kan bæres uden den.
 *
 * Bemærk at listen ikke opfinder noget. Enter, Shift+Enter, Escape og
 * håndfri tilstandens mellemrum/piletaster har været i appen hele tiden —
 * de har bare ikke stået nogen steder.
 */
export function ShortcutsDialog({ lang, open, onClose }: ShortcutsDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const global: Row[] = [
    { keys: [ALT, SHORTCUT_KEYS.help.label], what: tr("scHelp", lang) },
    { keys: [ALT, SHORTCUT_KEYS.focusField.label], what: tr("scFocusField", lang) },
    { keys: [ALT, SHORTCUT_KEYS.mic.label], what: tr("scMic", lang) },
    { keys: [ALT, SHORTCUT_KEYS.handsfree.label], what: tr("scHandsfree", lang) },
    { keys: [ALT, SHORTCUT_KEYS.newSession.label], what: tr("scNew", lang) },
    { keys: [ALT, SHORTCUT_KEYS.lang.label], what: tr("scLang", lang) },
    // «?» er konventionen og står med — men den kan kun bruges når markøren
    // ikke står i skrivefeltet, for dér er «?» et rigtigt tegn.
    { keys: [HELP_CHAR], what: tr("scHelpChar", lang) },
  ];

  const field: Row[] = [
    { keys: ["Enter"], what: tr("scSend", lang) },
    { keys: ["Shift", "Enter"], what: tr("scNewline", lang) },
    { keys: ["Esc"], what: tr("scCancelDictation", lang) },
  ];

  const or: Row[] = [
    { keys: [tr("keySpace", lang), "→"], what: tr("scOrNext", lang), sep: "/" },
    { keys: ["←"], what: tr("scOrBack", lang) },
    { keys: ["R"], what: tr("scOrRepeat", lang) },
    { keys: ["Esc"], what: tr("scOrExit", lang) },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(16,41,43,0.35)] px-4 py-10"
      onPointerDown={(e) => {
        if (!panelRef.current?.contains(e.target as Node)) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="motion-forward w-full max-w-lg rounded-2xl border border-[var(--line)] bg-[var(--paper-raised)] p-5 shadow-[var(--shadow-lifted)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id="shortcuts-title"
            className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--ink)]"
          >
            {tr("shortcutsTitle", lang)}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={tr("shortcutsClose", lang)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--line-strong)] text-[var(--ink-soft)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)] hover:text-[var(--teal-deep)]"
          >
            <svg viewBox="0 0 20 20" width={13} height={13} fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-4">
          <Group title={tr("shortcutsGroupGlobal", lang)} rows={global} />
          <Group title={tr("shortcutsGroupField", lang)} rows={field} />
          <Group title={tr("shortcutsGroupOr", lang)} rows={or} />
        </div>

        <p className="mt-5 border-t border-[var(--line)] pt-3 text-[13px] leading-relaxed text-[var(--ink-soft)]">
          {tr("shortcutsNote", lang)}
        </p>
      </div>
    </div>
  );
}
