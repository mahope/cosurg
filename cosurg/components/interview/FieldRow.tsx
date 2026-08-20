"use client";

import { useState } from "react";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import type { Besvarelse, Felt } from "./schema";

/**
 * Én linje i anamnesen: hvad der skal spørges om, og hvad der er svaret.
 *
 * Linjen er altid besvarbar direkte. Stemmen er den hurtige vej, men den må
 * aldrig være den eneste: mikrofonen kan nægte, rummet kan larme, og en
 * anamnese må ikke kunne gå i stå af en lydfejl. Valg klikkes, tal og tekst
 * skrives — samme vej ind i skemaet som det talte.
 */

interface FieldRowProps {
  felt: Felt;
  svar?: Besvarelse;
  lang: Lang;
  /** Er det feltet lægen skal spørge om nu? */
  naeste: boolean;
  onSvar: (value: string, display: string) => void;
  onRyd: () => void;
  onLaesOp: () => void;
}

export function FieldRow({ felt, svar, lang, naeste, onSvar, onRyd, onLaesOp }: FieldRowProps) {
  const [udkast, setUdkast] = useState("");
  const udfyldt = !!svar;

  const send = () => {
    const rent = udkast.trim();
    if (!rent) return;
    const display = felt.unit ? `${rent} ${felt.unit[lang]}` : rent;
    // Feltet ryddes her og ikke i en effekt: bliver svaret senere ryddet igen,
    // skal linjen stå tom og klar, ikke med den gamle tekst liggende.
    setUdkast("");
    onSvar(rent, display);
  };

  return (
    <div
      className={`rounded-xl border px-4 py-3 transition-colors ${
        udfyldt
          ? "border-[var(--line)] bg-[var(--paper-raised)]"
          : naeste
          ? "border-[var(--teal)] bg-[var(--teal-tint)]"
          : "border-dashed border-[var(--line-strong)] bg-transparent"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          aria-hidden="true"
          className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
            udfyldt ? "border-[var(--teal)] bg-[var(--teal)]" : "border-[var(--line-strong)]"
          }`}
        >
          {udfyldt && (
            <svg viewBox="0 0 10 10" width="8" height="8" fill="none" aria-hidden="true">
              <path d="M1.5 5.2 4 7.5 8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>

        <span className="text-sm font-semibold text-[var(--ink)]">{felt.label[lang]}</span>

        {!felt.required && (
          <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            {tr("interviewOptional", lang)}
          </span>
        )}

        {udfyldt ? (
          <span className="ml-auto flex items-center gap-2">
            <span className="font-[family-name:var(--font-mono)] text-sm font-semibold text-[var(--teal-deep)]">
              {svar.display}
            </span>
            <button
              onClick={onRyd}
              className="text-[11px] text-[var(--ink-faint)] underline underline-offset-2 hover:text-[var(--ink)]"
            >
              {tr("interviewClear", lang)}
            </button>
          </span>
        ) : (
          <button
            onClick={onLaesOp}
            title={tr("interviewAskAloud", lang)}
            className="ml-auto rounded-md px-2 py-1 text-[11px] font-medium text-[var(--teal)] hover:bg-[var(--paper-raised)]"
          >
            🔊 {tr("interviewAskAloud", lang)}
          </button>
        )}
      </div>

      {!udfyldt && (
        <>
          <p className="mt-1.5 pl-7 text-sm leading-relaxed text-[var(--ink-soft)]">{felt.question[lang]}</p>

          <div className="mt-2 flex flex-wrap items-center gap-2 pl-7">
            {felt.options ? (
              felt.options.map((o) => (
                <button
                  key={o.value}
                  onClick={() => onSvar(o.value, o.label[lang])}
                  className="rounded-lg border bg-[var(--paper-raised)] px-3 py-1.5 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)]"
                >
                  {o.label[lang]}
                </button>
              ))
            ) : (
              <>
                <input
                  type={felt.type === "number" ? "number" : "text"}
                  inputMode={felt.type === "number" ? "decimal" : "text"}
                  value={udkast}
                  onChange={(e) => setUdkast(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") send();
                  }}
                  placeholder={felt.unit ? felt.unit[lang] : felt.label[lang]}
                  className="w-40 rounded-lg border bg-[var(--paper-raised)] px-3 py-1.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[var(--teal)] focus:outline-none"
                />
                <button
                  onClick={send}
                  disabled={!udkast.trim()}
                  className="rounded-lg bg-[var(--teal)] px-3 py-1.5 text-sm font-semibold text-white transition-opacity disabled:opacity-30"
                >
                  OK
                </button>
              </>
            )}
          </div>
        </>
      )}

      {udfyldt && svar.kilde === "voice" && svar.matched && (
        <p className="mt-1 pl-7 text-[11px] text-[var(--ink-faint)]">
          {tr("interviewHeard", lang)}: “{svar.matched}”
        </p>
      )}
    </div>
  );
}
