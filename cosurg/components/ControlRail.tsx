"use client";

import Link from "next/link";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { BrandMark } from "./BrandMark";
import { LangSwitch } from "./LangSwitch";
import { AboutTeamLink } from "./AboutTeamLink";
import { TreePicker, type TreeSummary } from "./TreePicker";
import { UsagePanel, type SessionUsage } from "./UsagePanel";
import { SizeLock, widestOf } from "./ui/SizeLock";
import { Tooltip } from "./ui/Tooltip";
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
}

/**
 * Instrumentpanelet: mærke + tillidsbudskab (altid synligt, ikke kun ved
 * disposition) + de tre sessionsvalg. Ét segmenteret kontrolbånd frem for
 * spredte enkeltknapper.
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
}: ControlRailProps) {
  return (
    /*
      På en telefon er der ikke plads til mærke og kontroller på samme linje.
      Rækken bryder derfor — men den bryder RENT: mærket får hele den første
      linje, kontrollerne hele den anden. `justify-between` ville ellers lade
      kontrollerne klumpe sig i højre side af en halv linje, forskelligt fra
      sprog til sprog, og lægen genkender knapper på deres plads.
    */
    <header className="mb-4 sm:mb-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Tooltip
            label={tr("tipHome", lang)}
            keys={combo(SHORTCUT_KEYS.newSession)}
            placement="bottom-start"
            className="shrink-0"
          >
            <Link href="/" onClick={onGoHome} className="shrink-0 transition-opacity hover:opacity-80">
              <BrandMark size={50} />
            </Link>
          </Tooltip>
          <div className="min-w-0">
            <Link href="/" onClick={onGoHome} className="transition-opacity hover:opacity-80">
              <h1 className="font-[family-name:var(--font-display)] text-[22px] font-semibold tracking-tight text-[var(--ink)]">
                {tr("title", lang)}
              </h1>
            </Link>
            {/* Før et forløb er valgt, ville trænavnet være et valg vi havde
                truffet for lægen. Der står linjen om hvad appen er i stedet.
                Linjen har fast højde: træ-vælgeren er en knap og taglinen et
                afsnit, og uden en fælles højde ville hele instrumentpanelet
                rykke fire pixel i det øjeblik forløbet starter. */}
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
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <UsagePanel lang={lang} usage={usage} />

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
                  {/* "Oplæsning fra" er bredere end "Speech off" — uden en låst
                      bredde flytter knapperne til højre sig hver gang man skifter
                      sprog eller slår oplæsning til. */}
                  <SizeLock variants={widestOf("voiceFull", "voiceKey")}>
                    {fullVoice ? tr("voiceFull", lang) : tr("voiceKey", lang)}
                  </SizeLock>
                </button>
              </Tooltip>
            </div>
          )}

          {/* Håndfri tilstand kan slås til før et forløb er valgt — lægen skal
              kunne tale fra første spørgsmål, ikke først når et træ er startet.

              Knappen er en KONTAKT, ikke sidens primære handling: slukket står
              den som de øvrige kontroller i rækken, tændt fyldes den med
              SurgeonBlue. Den bar før OR-tilstandens Turquoise mens den var
              tændt — den mørke verdens accent lagt oven på den lyse — og var
              dermed det stærkeste farvefelt på en ellers rolig skærm. */}
          <Tooltip
            label={tr("tipHandsfree", lang)}
            keys={combo(SHORTCUT_KEYS.handsfree)}
            placement="bottom-end"
          >
            <button
              onClick={onToggleOrMode}
              aria-pressed={orMode}
              className={`flex min-h-11 items-center rounded-lg border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40 ${
                orMode
                  ? "border-[var(--teal)] bg-[var(--teal)] text-white"
                  : "border-[var(--line-strong)] bg-[var(--paper-raised)] text-[var(--ink)] enabled:hover:border-[var(--teal)] enabled:hover:bg-[var(--teal-tint)]"
              }`}
            >
              <SizeLock variants={widestOf("orMode")}>{tr("orMode", lang)}</SizeLock>
            </button>
          </Tooltip>

          {/* Genvejsoversigten. Knappen er lille med vilje — den er en vej ind
              for musen, mens «?» er vejen for den der allerede har hænderne på
              tastaturet. Uden den ville genvejene kun kunne findes af den der
              på forhånd vidste at de fandtes. */}
          <Tooltip label={tr("tipShortcuts", lang)} keys={[HELP_CHAR]} placement="bottom-end">
            <button
              type="button"
              onClick={onOpenShortcuts}
              aria-label={tr("shortcutsTitle", lang)}
              aria-haspopup="dialog"
              className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--line-strong)] font-[family-name:var(--font-mono)] text-[12px] font-semibold text-[var(--ink-faint)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)] hover:text-[var(--teal-deep)]"
            >
              ?
            </button>
          </Tooltip>

          <AboutTeamLink lang={lang} />
        </div>
      </div>

      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--nude-tint)] px-3 py-1.5">
        <BrandMark size={14} />
        <p className="text-xs font-medium text-[var(--ink-soft)]">{tr("sourceNote", lang)}</p>
      </div>
    </header>
  );
}
