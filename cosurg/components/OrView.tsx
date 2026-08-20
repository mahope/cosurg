"use client";

import type { Disposition, Lang, TreeNode } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { ZoneMark } from "./ZoneMark";
import { StepImages } from "./StepImages";
import { RedFlagBanner } from "./RedFlagBanner";
import { NotePanel, type NoteResult } from "./NotePanel";
import { StatusLine } from "./ui/Working";
import { useStepMotion } from "./ui/useStepMotion";
import { SizeLock, widestOf } from "./ui/SizeLock";

interface OrViewProps {
  lang: Lang;
  treeName: string;
  node?: TreeNode;
  questionText: string;
  disposition?: Disposition;
  flash: string | null;
  /**
   * Det forud-formulerede opslag om flaget, skrevet i træet.
   *
   * Kirurgen er steril og kan ikke trykke, så grebet vises som det ORD han kan
   * sige — man skal ikke kunne en kommando udenad for at få den viden der
   * ligger et sekund væk.
   */
  flashLookup?: { label: string; question: string } | null;
  onAcknowledgeFlash: () => void;
  stepNumber: number;
  totalNodes: number;
  progress: number;
  listening: boolean;
  status: string | null;
  /**
   * Noget kræver en handling af brugeren — mikrofonen mangler tilladelse,
   * stemmetjenesten svarer ikke. Det skal SES i OR-tilstand, ellers står
   * kirurgen og taler til ingenting. Teksten er allerede oversat til noget
   * handlingsanvisende i page.tsx; her vises den bare stort nok.
   */
  notice: string | null;
  /** Trin-node: der er intet svar, kun en kvittering — så "næste" er hele svaret. */
  canAdvance: boolean;
  onNext: () => void;
  onSelectOption: (value: string, label: string) => void;
  onSubmitNumber: (value: string) => void;
  onExit: () => void;
  note: NoteResult | null;
  lastHeard: string | null;
}

const orSeverity: Record<Disposition["severity"], string> = {
  emergency: "var(--or-red)",
  refer: "var(--or-amber)",
  treat: "var(--or-green)",
  home: "var(--or-green)",
};

/**
 * OR-tilstand: en anden verden, ikke samme side i større skrift. Kirurgen
 * står sterilt, rører aldrig skærmen, og læser fra to meters afstand — så alt
 * andet end det ene aktive trin og dets billede er fjernet. Al håndfri styring
 * foregår med stemmen (næste/gentag/tilbage, se page.tsx).
 *
 * Skærmen er delt i tre faste bånd — status øverst, indhold i midten, hørt
 * tale nederst — så kirurgen altid ved hvor han skal kigge. Midterbåndet er
 * det eneste der ændrer sig, og når trinnet har billeder, er det billedet der
 * får pladsen: instruktionsteksten er så kort at den kan stå over uden at
 * stjæle højde.
 */
export function OrView({
  lang,
  treeName,
  node,
  questionText,
  disposition,
  flash,
  flashLookup,
  onAcknowledgeFlash,
  stepNumber,
  totalNodes,
  progress,
  listening,
  status,
  notice,
  canAdvance,
  onNext,
  onSelectOption,
  onSubmitNumber,
  onExit,
  note,
  lastHeard,
}: OrViewProps) {
  const images = node?.images ?? disposition?.images ?? [];
  const hasImages = images.length > 0;
  /*
   * Midterbåndet er det eneste der skifter, så det er dér bevægelsen hører
   * hjemme. Retningen aflæses af trinnummeret: frem, tilbage eller erstattet.
   */
  const stageRef = useStepMotion<HTMLDivElement>(stepNumber, node?.id);

  return (
    /*
      OR-tilstand skifter hele verden — lys skærm bliver til mørk, ét trin ad
      gangen. `motion-world` gør skiftet til netop det: en verden der lukker
      sig om kirurgen, ikke et tema der bytter farver.
    */
    /*
      `dvh` og ikke `vh`: på iOS er `100vh` det høje viewport UDEN
      browserlinjen, så en `h-screen`-skærm er højere end det man ser, og
      betjeningsbåndet i bunden ender under adresselinjen. `100dvh` følger det
      viewport der faktisk er. Bunden får desuden plads til
      hjemmeindikatoren — båndet er fastgjort dernede og ville ellers ligge
      under den streg man swiper på.
    */
    <main
      className="or-scope motion-world flex h-[100dvh] flex-col overflow-hidden bg-[var(--or-bg)] px-4 py-4 text-[var(--or-ink)] sm:px-10 sm:py-5"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <header className="shrink-0">
        {/*
          Instrumentbåndet. Mærket og afslut-knappen bliver på samme linje —
          knappen er kirurgens vej UD, og den skal stå i hjørnet uanset skærm.
          Statuslinjen viger derfor ned på sin egen linje på en telefon
          (`basis-full order-last`) i stedet for at klemme knappen ud over
          kanten, som den gjorde på 390 px. Fra sm er båndet som før.
        */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <ZoneMark variant="listening" active={listening} tone="or" size={30} />
            <div className="min-w-0">
              {/* Mærkatet står på ÉN linje. "HÅNDFRI TILSTAND AKTIV" brød til
                  tre linjer på 360 px og skubbede hele instruktionen ned; at
                  den er klippet gør ingen skade — den mørke skærm siger
                  allerede hvilken tilstand man er i. */}
              <p className="truncate font-[family-name:var(--font-mono)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--or-accent)] sm:text-sm sm:tracking-[0.2em]">
                {tr("orModeOn", lang)}
              </p>
              {/* Linjen her må derimod IKKE klippes på en telefon: den slutter
                  med om mikrofonen er åben, og netop det må ikke forsvinde ud
                  over kanten i en håndfri tilstand. */}
              <p className="font-[family-name:var(--font-mono)] text-xs leading-snug text-[var(--or-ink-soft)] sm:truncate">
                {treeName}
                {node && ` · ${tr("step", lang)} ${stepNumber}/${totalNodes}`}
                {" · "}
                {/* Lukket mikrofon er ikke en detalje i OR-tilstand: så virker
                    stemmestyringen ikke, og det skal ses uden at kigge efter. */}
                <span className={listening ? undefined : "font-semibold text-[var(--or-amber)]"}>
                  {listening ? tr("micOpen", lang) : tr("micClosed", lang)}
                </span>
              </p>
            </div>
          </div>

          {/* Statuslinjen bærer både "Fortolker…" og en netværksbesked — den
              sidste skal kunne læses på afstand, så den får sm og ikke xs.
              De to må ikke ligne hinanden: kun "arbejder" får prikker, og
              kun fejl får den gule farve.

              Den er `flex-1` og ikke en naboklods, så afslut-knappen bliver
              stående i hjørnet uanset om der står noget. Kirurgen sigter aldrig
              efter en knap der har flyttet sig. */}
          <StatusLine
            status={status}
            lang={lang}
            tone="or"
            className="order-last min-w-0 basis-full font-[family-name:var(--font-mono)] text-sm leading-snug sm:order-none sm:basis-auto sm:flex-1 sm:justify-end sm:text-right"
          />
          <button
            onClick={onExit}
            className="flex min-h-11 shrink-0 items-center rounded-lg border border-[var(--or-line)] px-3 py-1.5 text-xs font-medium text-[var(--or-ink-soft)] transition-colors hover:border-[var(--or-accent)] hover:text-[var(--or-accent)]"
          >
            <SizeLock variants={widestOf("orExit")}>{tr("orExit", lang)}</SizeLock>
          </button>
        </div>

        {/* Fremdrift som en tynd linje — aflæselig på afstand, uden at fylde. */}
        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-[var(--or-line)]">
          <div
            className="h-full rounded-full bg-[var(--or-accent)] transition-[width] duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>

        {/*
          Et bånd, ikke en dialog: kirurgen er steril og kan ikke lukke noget.
          Gul og ikke rød — rød er reserveret til rødt flag, og en mikrofon uden
          tilladelse må aldrig kunne forveksles med en klinisk alarm.
        */}
        {notice && (
          <p
            role="status"
            className="mt-3 rounded-xl border border-[var(--or-amber)] bg-[var(--or-amber-soft)] px-4 py-2.5 text-base font-medium leading-snug text-[var(--or-amber)]"
          >
            {notice}
          </p>
        )}
      </header>

      <div ref={stageRef} className="flex min-h-0 flex-1 flex-col justify-center py-6">
        {flash ? (
          <RedFlagBanner
            message={flash}
            lang={lang}
            orMode
            onAcknowledge={onAcknowledgeFlash}
            /* Håndfri: grebet er et ord, ikke et tryk. Banneret viser derfor
               kun ordlyden — selve opslaget udløses af stemmekommandoen. */
            lookup={flashLookup}
          />
        ) : disposition ? (
          <div
            className="motion-settle overflow-y-auto rounded-2xl border-2 p-5 sm:p-8 md:p-10"
            style={{ borderColor: orSeverity[disposition.severity], background: "var(--or-surface)" }}
          >
            <p
              className="font-[family-name:var(--font-mono)] text-sm font-semibold uppercase tracking-[0.2em]"
              style={{ color: orSeverity[disposition.severity] }}
            >
              {tr("recommendation", lang)}
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold leading-tight sm:text-5xl">
              {disposition.title[lang]}
            </h2>
            <p className="mt-5 text-xl leading-relaxed text-[var(--or-ink-soft)] sm:text-2xl">
              {disposition.guidance[lang]}
            </p>
            <p className="mt-6 font-[family-name:var(--font-mono)] text-sm text-[var(--or-ink-soft)]">
              {tr("sourceNote", lang)}
            </p>
            {note && <NotePanel note={note} lang={lang} orMode />}
          </div>
        ) : node ? (
          <>
            <h2
              aria-live="polite"
              className={`shrink-0 font-[family-name:var(--font-display)] font-semibold tracking-tight ${
                hasImages
                  ? "text-[clamp(1.6rem,3.4vw,2.9rem)] leading-[1.15]"
                  : "text-[clamp(2.5rem,6vw,5.5rem)] leading-[1.05]"
              }`}
            >
              {questionText}
            </h2>

            {node.answerType === "number" ? (
              <input
                type="number"
                min={node.min}
                max={node.max}
                placeholder={node.unit}
                className="mt-6 w-full max-w-64 shrink-0 rounded-xl border border-[var(--or-line)] bg-[var(--or-surface)] px-5 py-4 text-2xl text-[var(--or-ink)] focus:border-[var(--or-accent)] focus:outline-none sm:mt-8 sm:text-3xl"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const v = (e.target as HTMLInputElement).value;
                    if (v) onSubmitNumber(v);
                  }
                }}
              />
            ) : node.options && node.options.length > 0 ? (
              <div className="mt-6 flex shrink-0 flex-wrap gap-2.5 sm:mt-8 sm:gap-3">
                {node.options.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => onSelectOption(o.value, o.label[lang])}
                    className="max-w-full rounded-xl border border-[var(--or-line)] bg-[var(--or-surface)] px-5 py-4 text-xl font-medium transition-colors hover:border-[var(--or-accent)] hover:bg-[var(--or-surface-raised)] sm:px-7 sm:py-5 sm:text-2xl"
                  >
                    <SizeLock wrap variants={[o.label.da, o.label.en]}>
                      {o.label[lang]}
                    </SizeLock>
                  </button>
                ))}
              </div>
            ) : null}

            <StepImages images={images} lang={lang} large priority />
          </>
        ) : null}
      </div>

      {/*
        Betjeningsbåndet. Kirurgen bruger kun stemmen — knappen her er for den
        usterile assistent og appens forsikring hvis mikrofonen svigter under
        demoen. Den ligger nederst hos de øvrige kontroller, ikke oppe i
        instruktionen, så billedet får hele midterbåndet.
      */}
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-[var(--or-line)] pt-3">
        <div className="flex min-w-0 items-center gap-4">
          {/* Knappen står i sin plads hele forløbet igennem og bliver blot
              usynlig på de noder hvor der ikke er et trin at kvittere. Ellers
              ville stemmekommando-hintet ved siden af hoppe frem og tilbage
              hver anden node — netop dét kirurgen læser på afstand. */}
          <button
            onClick={onNext}
            tabIndex={canAdvance ? 0 : -1}
            aria-hidden={!canAdvance}
            className={`flex min-h-11 shrink-0 items-center rounded-lg border border-[var(--or-accent)] bg-[var(--or-accent-soft)] px-4 py-2 text-base font-semibold text-[var(--or-accent)] transition-colors hover:bg-[var(--or-surface-raised)] ${
              canAdvance ? "" : "invisible pointer-events-none"
            }`}
          >
            <SizeLock variants={widestOf("nextStep").map((s) => `${s} →`)}>
              {tr("nextStep", lang)} →
            </SizeLock>
          </button>
          <p className="font-[family-name:var(--font-mono)] text-sm text-[var(--or-ink-soft)]">
            <span className="text-[var(--or-accent)]">{tr("orCommands", lang)}:</span> {tr("orHint", lang)}
          </p>
        </div>
        {/* Hvad appen sidst hørte. Kirurgen skal kunne se at han blev forstået
            uden at vente på kvitteringen — og en skærmlæser skal kunne følge
            med i det samme. */}
        <p
          aria-live="polite"
          aria-atomic="true"
          className="motion-fade min-h-[1.25rem] font-[family-name:var(--font-mono)] text-sm text-[var(--or-ink)]"
        >
          {lastHeard && (
            <>
              <span className="text-[var(--or-ink-soft)]">{tr("heard", lang)}: </span>
              &ldquo;{lastHeard}&rdquo;
            </>
          )}
        </p>
      </footer>
    </main>
  );
}
