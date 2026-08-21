"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { clearConversations, deleteConversation, listConversations } from "@/lib/history";

interface HistoryPanelProps {
  lang: Lang;
  open: boolean;
  onClose: () => void;
  /** Åbn en gemt samtale — hele tråden vises igen, og der kan skrives videre. */
  onOpen: (id: string) => void;
}

/**
 * HISTORIKKEN — tidligere samtaler, som en dialog oven på siden.
 *
 * En dialog og ikke et sidepanel, fordi layoutet skal stå stille: intet må
 * skubbe til det store skrivefelt, som ER produktet. Panelet lånes fra
 * ShortcutsDialog — samme overlay, samme lukkemåder — så lægen kun skal
 * lære én slags dialog.
 *
 * Panelet kender KUN lib/history's fem funktioner, aldrig localStorage. Den
 * dag historikken flytter server-side pr. bruger, røres denne fil ikke.
 */
export function HistoryPanel({ lang, open, onClose, onOpen }: HistoryPanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  /*
   * "Ryd historik" bekræftes i to klik i selve knappen. En browser-confirm
   * ville bryde stilen, og en sletning af al klinisk historik uden
   * bekræftelse ville være uigenkaldelig med ét fejlklik.
   */
  const [confirmingClear, setConfirmingClear] = useState(false);
  /*
   * Listen læses i selve renderen, ikke i en effekt: et lukket panel læser
   * ingenting, og et åbent læser frisk — så kan en anden fane have ændret
   * historikken uden at panelet viser i går. Sletningerne bumper blot en
   * render (`refreshList`), og listen følger med af sig selv.
   */
  const [, refreshList] = useReducer((n: number) => n + 1, 0);
  const items = open ? listConversations() : [];

  /** Al lukning går her igennem, så en halvt bekræftet rydning aldrig overvintrer. */
  const close = useCallback(() => {
    setConfirmingClear(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  const remove = (id: string) => {
    deleteConversation(id);
    refreshList();
  };

  const clearAll = () => {
    if (!confirmingClear) {
      setConfirmingClear(true);
      return;
    }
    clearConversations();
    setConfirmingClear(false);
    refreshList();
  };

  const dateFormat = new Intl.DateTimeFormat(lang === "da" ? "da-DK" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(16,41,43,0.35)] px-4 py-10"
      onPointerDown={(e) => {
        if (!panelRef.current?.contains(e.target as Node)) close();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
        className="motion-forward w-full max-w-lg rounded-2xl border border-[var(--line)] bg-[var(--paper-raised)] p-5 shadow-[var(--shadow-lifted)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id="history-title"
            className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--ink)]"
          >
            {tr("historyTitle", lang)}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label={tr("historyClose", lang)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--line-strong)] text-[var(--ink-soft)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)] hover:text-[var(--teal-deep)]"
          >
            <svg viewBox="0 0 20 20" width={13} height={13} fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <p className="mt-4 text-sm leading-relaxed text-[var(--ink-soft)]">{tr("historyEmpty", lang)}</p>
        ) : (
          <>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ink-soft)]">
              {tr("historyResumeHint", lang)}
            </p>
            <ul className="mt-4">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2 border-t border-[var(--line)] py-1.5 first:border-t-0"
                >
                  <button
                    type="button"
                    onClick={() => onOpen(item.id)}
                    className="min-w-0 flex-1 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[var(--teal-tint)]"
                  >
                    <span className="block truncate text-sm font-medium leading-snug text-[var(--ink)]">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block font-[family-name:var(--font-mono)] text-[11px] text-[var(--ink-faint)]">
                      {dateFormat.format(new Date(item.updatedAt))} · {item.turnCount}{" "}
                      {tr(item.turnCount === 1 ? "historyQuestionOne" : "historyQuestions", lang)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    aria-label={`${tr("historyDelete", lang)}: ${item.title}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-[var(--ink-faint)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
                  >
                    <svg viewBox="0 0 20 20" width={13} height={13} fill="none" aria-hidden="true">
                      <path
                        d="M4 6h12M8.5 6V4.5h3V6M6 6l.7 9.5h6.6L14 6M8.5 9v4M11.5 9v4"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-4 border-t border-[var(--line)] pt-3">
              <button
                type="button"
                onClick={clearAll}
                className="rounded-lg border border-[var(--line-strong)] bg-[var(--paper)] px-3.5 py-2 text-sm font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--nude-deep)] hover:text-[var(--ink)]"
              >
                {confirmingClear ? tr("historyClearConfirm", lang) : tr("historyClear", lang)}
              </button>
            </div>
          </>
        )}

        {/* Følsomhedslinjen står ALTID — også over en tom liste: at intet er
            gemt endnu er netop det øjeblik man beslutter om man tør bruge den
            på en delt maskine. */}
        <p className="mt-5 border-t border-[var(--line)] pt-3 text-[13px] leading-relaxed text-[var(--ink-soft)]">
          {tr("historyLocalOnly", lang)}
        </p>
      </div>
    </div>
  );
}
