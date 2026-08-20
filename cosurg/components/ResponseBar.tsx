"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { Tooltip } from "./ui/Tooltip";
import { combo, SHORTCUT_KEYS } from "./shortcuts";

interface ResponseBarProps {
  lang: Lang;
  placeholder: string;
  listening: boolean;
  interim: string;
  onToggleMic: () => void;
  onSubmit: (text: string) => void;
  autoFocus?: boolean;
  /**
   * Styret tilstand. Udelades den, ejer feltet sin egen tekst som hidtil.
   *
   * Indgangsskærmen sætter den, fordi kladden dér skal ses to steder på én
   * gang: i feltet, og i linjen under der viser hvad appen er ved at forstå.
   * To kopier af den samme tekst kan komme ud af trit — så er der kun én, og
   * den bor hos den der har brug for at læse den.
   */
  value?: string;
  onValueChange?: (text: string) => void;
  /** Så et klikbart eksempel kan lægge markøren i feltet bagefter. */
  inputRef?: RefObject<HTMLInputElement | null>;
  /** Større type og luft. Kun forsiden, hvor feltet ER produktet. */
  size?: "default" | "hero";
}

/**
 * Ét samlet svarfelt for klik, tale og skrift. Skrift og tale rammer nøjagtig
 * samme vej ind (onSubmit → handleUtterance i page.tsx) — feltet er blot to
 * forskellige måder at fylde det på. Mikrofonen sidder inde i feltet, ikke som
 * en separat knap et andet sted på siden, og den løbende tale vises som
 * spøgelsestekst i samme linje som det man selv skriver.
 */
export function ResponseBar({
  lang,
  placeholder,
  listening,
  interim,
  onToggleMic,
  onSubmit,
  autoFocus,
  value: controlledValue,
  onValueChange,
  inputRef,
  size = "default",
}: ResponseBarProps) {
  const [ownValue, setOwnValue] = useState("");
  const controlled = controlledValue !== undefined;
  const value = controlled ? controlledValue : ownValue;
  /*
   * Kort kvittering på at svaret forlod feltet. Den er sand uanset hvad
   * agenten svarer bagefter — derfor må den ikke ligne en arbejdsindikator,
   * og derfor forsvinder den af sig selv. Uden den er et tomt felt det eneste
   * tegn på at man overhovedet trykkede.
   */
  const [sent, setSent] = useState(false);
  const sentTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(sentTimer.current), []);

  const change = (text: string) => {
    if (!controlled) setOwnValue(text);
    onValueChange?.(text);
  };

  const submit = () => {
    const text = value.trim();
    if (!text) return;
    onSubmit(text);
    change("");
    setSent(true);
    window.clearTimeout(sentTimer.current);
    sentTimer.current = window.setTimeout(() => setSent(false), 1400);
  };

  const hero = size === "hero";

  return (
    <div className="w-full">
      <div
        /* Samme fokussprog som komposeren: hårfin ramme, blød ring. Se
           .field-shell i globals.css. */
        className={`field-shell relative flex items-center gap-1 rounded-xl bg-[var(--paper-raised)] ${
          hero
            ? "py-2.5 pl-2 pr-1.5 [--field-shadow:0_2px_10px_rgba(0,83,85,0.07)]"
            : "py-1.5 pl-1.5 pr-1"
        }`}
      >
        <Tooltip
          label={tr(listening ? "tipMicStop" : "tipMicStart", lang)}
          keys={combo(SHORTCUT_KEYS.mic)}
          placement="top-start"
          className="shrink-0"
        >
        <button
          type="button"
          onClick={onToggleMic}
          aria-pressed={listening}
          aria-label={tr(listening ? "micStop" : "micStart", lang)}
          className={`relative flex shrink-0 items-center justify-center rounded-lg transition-colors ${
            hero ? "h-11 w-11" : "h-10 w-10 sm:h-8 sm:w-8"
          } ${
            listening
              ? "text-[var(--teal)]"
              : "text-[var(--ink-soft)] hover:bg-[var(--teal-tint)] hover:text-[var(--teal-deep)]"
          }`}
        >
          {listening && (
            <>
              <span
                className="zone-pulse-ring absolute inset-0.5 rounded-full border"
                style={{ borderColor: "var(--teal)" }}
              />
              <span
                className="zone-pulse-ring absolute inset-0.5 rounded-full border"
                style={{ borderColor: "var(--teal)", animationDelay: "0.6s" }}
              />
            </>
          )}
          <svg viewBox="0 0 24 24" width={hero ? 21 : 18} height={hero ? 21 : 18} fill="none" aria-hidden="true">
            <path
              d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M19 10v2a7 7 0 0 1-14 0v-2"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M12 19v3M8.5 22h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        </Tooltip>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => change(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          autoFocus={autoFocus}
          placeholder={interim ? interim : placeholder}
          className={`min-w-0 flex-1 self-stretch bg-transparent py-1 text-[var(--ink)] placeholder:text-[var(--ink-faint)] placeholder:italic focus:outline-none ${
            hero ? "px-2 text-lg leading-snug" : "px-1.5 text-base leading-tight sm:text-[15px]"
          }`}
        />

        {/*
          Kvitteringen ligger OVEN PÅ feltets højre kant i stedet for i rækken.
          Lå den i rækken, ville skrivefeltet blive smallere i det sekund den
          var fremme — og feltet ville altså skifte størrelse hver gang man
          svarede. Den toner ind og ud i en plads der ikke er nogens.
        */}
        <span
          aria-hidden={!sent}
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 bg-[var(--paper-raised)] pl-2 font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--teal-deep)] transition-opacity duration-200 ${
            hero ? "right-14" : "right-12 sm:right-11"
          } ${sent ? "opacity-100" : "opacity-0"}`}
        >
          {tr("sent", lang)}
        </span>

        <Tooltip label={tr("tipSendAnswer", lang)} keys={["Enter"]} placement="top-end" className="shrink-0">
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim()}
            aria-label={tr("sendAnswer", lang)}
            className={`flex shrink-0 items-center justify-center rounded-lg bg-[var(--teal)] text-white transition-opacity disabled:opacity-25 ${
              hero ? "h-11 w-11" : "h-10 w-10 sm:h-8 sm:w-8"
            }`}
          >
            <svg viewBox="0 0 20 20" width={hero ? 18 : 15} height={hero ? 18 : 15} fill="none" aria-hidden="true">
              <path
                d="M4 10h11m0 0-4.5-4.5M15 10l-4.5 4.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
