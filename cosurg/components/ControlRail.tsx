"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { BrandMark } from "./BrandMark";
import { LangSwitch } from "./LangSwitch";
import { TreePicker, type TreeSummary } from "./TreePicker";
import { UsagePanel, type SessionUsage } from "./UsagePanel";
import { SizeLock, widestOf } from "./ui/SizeLock";
import { Tooltip } from "./ui/Tooltip";
import { HistoryIcon, HistoryMenu } from "./history/HistoryMenu";
import { combo, HELP_CHAR, SHORTCUT_KEYS } from "./shortcuts";

interface ControlRailProps {
  lang: Lang;
  /** Er et forløb valgt? Før da er der intet aktivt træ at navngive. */
  started: boolean;
  usage: SessionUsage;
  treeId: string;
  treeName: string;
  treeVersion: string;
  trees: TreeSummary[];
  treeBusy: boolean;
  onSelectTree: (id: string) => void;
  onGoHome: () => void;
  fullVoice: boolean;
  orMode: boolean;
  onToggleLang: () => void;
  onToggleVoiceMode: () => void;
  onToggleOrMode: () => void;
  /** Åbner genvejsoversigten — den samme «?» siden lytter efter. */
  onOpenShortcuts: () => void;
  /** Åbner samtalehistorikken (det fulde panel med slet og ryd). */
  onOpenHistory: () => void;
  /** Åbner én gemt samtale direkte — historik-dropdownens hurtige vej. */
  onOpenConversation: (id: string) => void;
}

/**
 * Instrumentpanelet, i to lag:
 *
 *  - En STICKY bar med det man faktisk betjener undervejs: sprog, håndfri,
 *    historik og menuen. Den følger med ved scroll, så historikken og
 *    sprogskiftet altid er ét klik væk — også nederst i en lang tråd.
 *  - Under den, i almindeligt flow: forløbsvælgeren og tillidsbudskabet.
 *    De er kontekst, ikke betjening, og skal ikke æde skærm på en telefon
 *    hvor toppen og komposeren i bunden allerede deler pladsen.
 *
 * Grupperet efter brugsfrekvens: det hyppige (sprog, håndfri, historik) står
 * synligt; det sjældne (ny samtale, genveje, Om & Team, forbrug) er samlet i
 * én menu — burger på telefon, samme knap på desktop, så intet skal læres to
 * gange. Flag og Håndfri er bevidst SYNLIGE på mobil, blot mindre — de er de
 * to ting man faktisk skifter — og alle mål holder 44 px touch.
 */
export function ControlRail({
  lang,
  started,
  usage,
  treeId,
  treeName,
  treeVersion,
  trees,
  treeBusy,
  onSelectTree,
  onGoHome,
  fullVoice,
  orMode,
  onToggleLang,
  onToggleVoiceMode,
  onToggleOrMode,
  onOpenShortcuts,
  onOpenHistory,
  onOpenConversation,
}: ControlRailProps) {
  const treeLine = (
    <div className="flex h-5 items-center">
      {started ? (
        <TreePicker
          lang={lang}
          trees={trees}
          activeId={treeId}
          activeName={treeName}
          activeVersion={treeVersion}
          busy={treeBusy}
          onSelect={onSelectTree}
        />
      ) : (
        <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--ink-faint)]">
          {tr("tagline", lang)}
        </p>
      )}
    </div>
  );

  return (
    <>
      {/*
        Den klæbende bar. STICKY PÅ SELVE HEADEREN, ikke på et barn af den: et
        sticky element kan kun klæbe inden for sin forælders boks, og en
        header der selv ruller væk ville tage baren med sig — målt til
        top=-534 ved 600 px scroll før denne ændring. Som direkte barn af
        sidens fulde container klæber den hele vejen ned.

        `-mx-4`/`-mx-6` lader den fylde sidens indrykning ud, så indhold ikke
        kan skimtes glide forbi i kanterne; baggrunden er tæt papir, for en
        gennemsigtig bar oven på en rullende tråd er uro. z-30: over
        indholdet, under dialogerne (z-50).
      */}
      <header className="sticky top-0 z-30 -mx-4 border-b border-[var(--line)] bg-[var(--paper)] px-4 py-2 sm:-mx-6 sm:px-6 sm:py-2.5">
        <div className="flex min-h-11 items-center justify-between gap-2 sm:gap-4">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            {/* På telefon er ordmærket mærket, og logoet viger — 50 px der i
                stedet lader "CoSurg" stå helt i stedet for som "C…". Skjules
                i en egen wrapper: Tooltip'ens rod bærer selv `inline-flex`,
                og to display-utilities på samme element er et terningkast. */}
            <span className="hidden shrink-0 sm:block">
              <Tooltip
                label={tr("tipHome", lang)}
                keys={combo(SHORTCUT_KEYS.newSession)}
                placement="bottom-start"
                className="shrink-0"
              >
                <Link href="/" onClick={onGoHome} className="shrink-0 transition-opacity hover:opacity-80">
                  <BrandMark size={40} />
                </Link>
              </Tooltip>
            </span>
            <div className="min-w-0">
              <Link href="/" onClick={onGoHome} className="transition-opacity hover:opacity-80">
                <h1 className="truncate font-[family-name:var(--font-display)] text-[20px] font-semibold tracking-tight text-[var(--ink)] sm:text-[22px]">
                  {tr("title", lang)}
                </h1>
              </Link>
              {/* Forløbslinjen bor i baren på desktop, hvor der er plads. På
                  telefon står den under baren (se nedenfor) — en sticky bar i
                  to etager ville æde skærmen mellem tastatur og komposer. */}
              <div className="hidden sm:block">{treeLine}</div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <LangSwitch lang={lang} onToggleLang={onToggleLang} />

            {/* Opslæsning findes kun som kontrol i håndfri tilstand — uden for
                den er der ingen oplæsning at slå til eller fra. */}
            {orMode && (
              <div className="flex items-center rounded-lg border bg-[var(--paper-raised)] p-0.5">
                <Tooltip label={tr("tipSpeech", lang)} placement="bottom-end">
                  <button
                    onClick={onToggleVoiceMode}
                    disabled={orMode}
                    aria-pressed={fullVoice}
                    className={`flex min-h-10 items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                      fullVoice ? "bg-[var(--teal-tint)] text-[var(--teal-deep)]" : "text-[var(--ink-soft)]"
                    }`}
                  >
                    <SizeLock variants={widestOf("voiceFull", "voiceKey")}>
                      {fullVoice ? tr("voiceFull", lang) : tr("voiceKey", lang)}
                    </SizeLock>
                  </button>
                </Tooltip>
              </div>
            )}

            {/* Håndfri: synlig overalt — det er en af de to ting man faktisk
                skifter. Kompakt på telefon, men aldrig under 44 px høj. */}
            <Tooltip
              label={tr("tipHandsfree", lang)}
              keys={combo(SHORTCUT_KEYS.handsfree)}
              placement="bottom-end"
            >
              <button
                onClick={onToggleOrMode}
                aria-pressed={orMode}
                className={`flex min-h-11 items-center rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors disabled:opacity-40 sm:px-4 sm:text-sm ${
                  orMode
                    ? "border-[var(--teal)] bg-[var(--teal)] text-white"
                    : "border-[var(--line-strong)] bg-[var(--paper-raised)] text-[var(--ink)] enabled:hover:border-[var(--teal)] enabled:hover:bg-[var(--teal-tint)]"
                }`}
              >
                {/* Kort etiket på telefon — "Håndfri tilstand" åd mærkenavnet
                    på 390 px. Begge udgaver er breddelåste, så baren står
                    stille ved sprogskift. */}
                <span className="sm:hidden">
                  <SizeLock variants={widestOf("orModeShort")}>{tr("orModeShort", lang)}</SizeLock>
                </span>
                <span className="hidden sm:flex">
                  <SizeLock variants={widestOf("orMode")}>{tr("orMode", lang)}</SizeLock>
                </span>
              </button>
            </Tooltip>

            {/* Historik: på desktop en tydelig knap med de seneste samtaler i
                en dropdown; på telefon et ikon der åbner det fulde panel —
                og fordi baren er sticky, er den altid ét tryk væk. */}
            <div className="hidden sm:inline-flex">
              <HistoryMenu lang={lang} onOpen={onOpenConversation} onShowAll={onOpenHistory} />
            </div>
            <Tooltip label={tr("historyTitle", lang)} placement="bottom-end" className="sm:hidden">
              <button
                type="button"
                onClick={onOpenHistory}
                aria-label={tr("historyTitle", lang)}
                aria-haspopup="dialog"
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--line-strong)] bg-[var(--paper-raised)] text-[var(--ink-soft)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)] hover:text-[var(--teal-deep)]"
              >
                <HistoryIcon size={16} />
              </button>
            </Tooltip>

            <RailMenu lang={lang} usage={usage} onGoHome={onGoHome} onOpenShortcuts={onOpenShortcuts} />
          </div>
        </div>
      </header>

      {/* Under baren, i almindeligt flow: forløbet (kun telefon — desktop har
          det i baren) og tillidsbudskabet. */}
      <div className="mb-4 sm:mb-5">
        <div className="mt-3 sm:hidden">{treeLine}</div>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--nude-tint)] px-3 py-1.5 sm:mt-4">
          <BrandMark size={14} />
          <p className="text-xs font-medium text-[var(--ink-soft)]">{tr("sourceNote", lang)}</p>
        </div>
      </div>
    </>
  );
}

/**
 * MENUEN — det sjældne, samlet ét sted.
 *
 * Samme knap på telefon og desktop: ny samtale, tastaturgenveje (kun hvor
 * der ER et tastatur), Om & Team og Corti-forbruget. Rigtig knap med
 * `aria-expanded`, Escape lukker og giver fokus tilbage, klik udenfor
 * lukker, og fokus starter på første punkt.
 */
function RailMenu({
  lang,
  usage,
  onGoHome,
  onOpenShortcuts,
}: {
  lang: Lang;
  usage: SessionUsage;
  onGoHome: () => void;
  onOpenShortcuts: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const rowClass =
    "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--ink)] transition-colors hover:bg-[var(--teal-tint)]";

  return (
    <div ref={rootRef} className="relative inline-flex">
      <Tooltip label={tr("menuLabel", lang)} placement="bottom-end">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={tr("menuLabel", lang)}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--line-strong)] bg-[var(--paper-raised)] text-[var(--ink-soft)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)] hover:text-[var(--teal-deep)]"
        >
          <svg viewBox="0 0 20 20" width={16} height={16} fill="none" aria-hidden="true">
            <path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </Tooltip>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-[min(17rem,calc(100vw-2rem))] rounded-xl border border-[var(--line)] bg-[var(--paper-raised)] p-2 shadow-[var(--shadow-lifted)]"
        >
          <button
            ref={firstItemRef}
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onGoHome();
            }}
            className={rowClass}
          >
            <span>{tr("menuNewSession", lang)}</span>
            <Keys keys={combo(SHORTCUT_KEYS.newSession)} />
          </button>

          {/* Genvejene findes kun hvor der er et tastatur — på telefon ville
              punktet pege på taster der ikke findes. */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenShortcuts();
            }}
            className={`${rowClass} hidden sm:flex`}
          >
            <span>{tr("shortcutsTitle", lang)}</span>
            <Keys keys={[HELP_CHAR]} />
          </button>

          <Link href="/aboutandteam" role="menuitem" className={rowClass} onClick={() => setOpen(false)}>
            <span>{tr("aboutTeam", lang)}</span>
          </Link>

          {/* Forbruget: interessant for dommere, støj for klinikeren — derfor
              her. Info-knappen er UsagePanels egen; dens panel åbner oven på
              menuen og lukker med de samme greb. */}
          <div className={`${rowClass} hover:bg-transparent`}>
            <span className="text-[var(--ink-soft)]">{tr("usageTitle", lang)}</span>
            <UsagePanel lang={lang} usage={usage} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Små tastekapsler til menupunkternes genvejshenvisninger. */
function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="flex shrink-0 items-center gap-1" aria-hidden="true">
      {keys.map((k) => (
        <kbd
          key={k}
          className="rounded border border-[var(--line)] bg-[var(--paper)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] text-[var(--ink-faint)]"
        >
          {k}
        </kbd>
      ))}
    </span>
  );
}
