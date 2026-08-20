"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import type { TreeSummary } from "./TreePicker";
import { SizeLock } from "./ui/SizeLock";
import { Tooltip } from "./ui/Tooltip";
import { combo, INTAKE_FIELD_ID, SHORTCUT_KEYS } from "./shortcuts";
import {
  MAX_IMAGES,
  readAttachment,
  toChatImages,
  type AttachError,
  type Attachment,
  type ChatImage,
} from "./attachments";

interface IntakeCardProps {
  lang: Lang;
  trees: TreeSummary[];
  /** Forløb vi ikke turde vælge imellem — vises som knapper når vi spørger igen. */
  ambiguous: string[];
  /** Sat når en ytring ikke kunne henføres til et forløb. */
  unresolved: string | null;
  listening: boolean;
  /** Mikrofonen er bedt om at åbne, men strømmen er der ikke endnu. */
  starting: boolean;
  /** Foreløbig tale — det der opfanges LIGE NU, endnu ikke afsluttet. */
  interim: string;
  /** Teksten i feltet. Den bor hos forælderen, fordi mikrofonen skriver ind i den. */
  draft: string;
  onDraftChange: (text: string) => void;
  onToggleMic: () => void;
  onSubmit: (text: string, images?: ChatImage[]) => void;
  onSelectTree: (id: string) => void;
  /**
   * Komposer-tilstand: samtalen er i gang, og indgangen VIGER for den.
   *
   * Overskriften, hjælpeteksten og den store mikrofon forsvinder; tilbage
   * står selve feltet med en lille mikrofon i værktøjslinjen. Det er samme
   * komponent og samme tilstand — feltet, vedhæftningerne og talen opfører
   * sig ens i begge udgaver, så intet skal læres om.
   */
  compact?: boolean;
}

/**
 * FORSIDEN — og dermed produktet.
 *
 * CoSurg er en klinisk assistent man taler eller skriver til. Forsiden skal
 * derfor kunne bæres af to ting alene: ét felt og én stor mikrofon. Alt andet
 * blev fjernet med vilje — eksempelknapper, forløbsvælgere, faneblade og
 * forklarende kort. Hver af dem var et VALG lægen skulle træffe før han kunne
 * begynde, og et valg under tidspres er en forsinkelse forklædt som hjælp.
 *
 * Tre beslutninger bærer skærmen:
 *
 * 1. MIKROFONEN SKRIVER MENS DER TALES. Den foreløbige tekst lægger sig som
 *    spøgelsesskrift i feltet, dér hvor ordene ender når segmentet er færdigt —
 *    ikke i en statuslinje et andet sted. Ventetid uden livstegn får folk til at
 *    tro at det ikke virker, og det er den fejl der koster en demo.
 *
 * 2. FELTET STARTER SOM ÉN LINJE OG VOKSER MED INDHOLDET. En stor tom flade
 *    lover plads; en linje der vokser viser den. Feltet vokser NEDAD, så
 *    overskriften og feltets top står stille uanset hvor meget der skrives.
 *
 * 3. BILLEDET FØLGER MED SPØRGSMÅLET. Et foto af såret er ofte det præcise
 *    spørgsmål — se attachments.ts for hvorfor det aldrig lander i et lager.
 *
 * Efter det første spørgsmål minimeres det hele til en komposer (`compact`),
 * og samtalen tager skærmen — se ChatThread.
 */
export function IntakeCard({
  lang,
  trees,
  ambiguous,
  unresolved,
  listening,
  starting,
  interim,
  draft,
  onDraftChange,
  onToggleMic,
  onSubmit,
  onSelectTree,
  compact = false,
}: IntakeCardProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachError, setAttachError] = useState<AttachError | null>(null);
  const [dragging, setDragging] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;
      setAttachError(null);

      const accepted: Attachment[] = [];
      let error: AttachError | null = null;

      for (const file of list) {
        const result = await readAttachment(file);
        if (typeof result === "string") {
          error = result;
          continue;
        }
        accepted.push(result);
      }

      setAttachments((prev) => {
        const room = MAX_IMAGES - prev.length;
        if (accepted.length > room) error = "intakeImageTooMany";
        return [...prev, ...accepted.slice(0, Math.max(room, 0))];
      });
      if (error) setAttachError(error);
    },
    [],
  );

  const onPickFiles = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) void addFiles(e.target.files);
    // Så den samme fil kan vælges igen efter den er fjernet.
    e.target.value = "";
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
  };

  /*
   * Et billede uden ord er stadig et spørgsmål — "hvad ser du?". Vi sætter
   * spørgsmålet for lægen i stedet for at spærre send-knappen, fordi det er
   * præcis den situation hvor han ikke har ord for det han ser.
   */
  const canSend = draft.trim().length > 0 || attachments.length > 0;

  /**
   * Send en bestemt tekst. `submit` (Enter/send-knappen) sender kladden som
   * den står; dikteringens veje sender kladden PLUS et eventuelt uafsluttet
   * interim-segment — stopper lægen selv midt i en sætning, er de sidste ord
   * hans egne, og de må ikke tabes fordi transskriptionen ikke nåede at
   * stemple dem færdige.
   */
  const submitText = (raw: string) => {
    if (!raw.trim() && attachments.length === 0) return;
    const text = raw.trim() || tr("intakeImageOnly", lang);
    const images = attachments.length > 0 ? toChatImages(attachments) : undefined;
    onSubmit(text, images);
    onDraftChange("");
    setAttachments([]);
    setAttachError(null);
  };

  const submit = () => submitText(draft);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sender, skift+enter giver en ny linje. En hel case skrives i
    // afsnit, og en textarea uden linjeskift ville være et inputfelt i
    // forklædning.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  /* ------------------------------------------------------------------ *
   * Dikteringens afslutning — uden ekstra klik
   *
   * Lægen taler sin case ind og skal ikke bagefter lede efter en
   * send-knap. To veje afslutter:
   *
   * 1. STOP SENDER. Trykker han på mikrofonen mens den lytter og der står
   *    tekst, stoppes optagelsen OG teksten sendes — ét tryk. Er feltet
   *    tomt, stopper trykket bare (fejlstart uden ord er en fortrydelse).
   *
   * 2. STILHED SENDER, MED VARSEL. Har hverken talen (interim) eller
   *    feltet rørt sig i et stykke tid, tæller knappen synligt ned og
   *    sender. Taler han videre under varslet, annulleres det — interim
   *    tæller som tale, så et ord der stadig ruller ind aldrig klippes.
   *
   * Fortryd: Escape (eller annullér-knappen under varslet) stopper uden at
   * sende. Teksten bliver stående i feltet — den forsvinder aldrig.
   *
   * Tastaturet er urørt: Enter sender som altid. Og håndfri tilstand (OR)
   * bruger slet ikke dette felt — dens egen auto-oplæsning kolliderer
   * derfor ikke med dikteringen her.
   */
  const SILENCE_BEFORE_WARN_MS = 3500;
  const COUNTDOWN_MS = 3000;

  /**
   * Sekunder tilbage af varslet. Null = intet varsel. Vises kun mens der
   * faktisk lyttes — stopper mikrofonen udefra (sprogskift, fejl), falder
   * varslet bort af sig selv uden at nogen skal huske at rydde op.
   */
  const [countdown, setCountdown] = useState<number | null>(null);
  const showCountdown = listening && countdown !== null ? countdown : null;

  const lastActivityRef = useRef(0);
  const stateRef = useRef({ draft, interim, hasAttachments: false });
  const submitRef = useRef<(raw: string) => void>(() => {});
  const toggleMicRef = useRef(onToggleMic);

  // Refs synkroniseres i en effekt (aldrig under render). De findes fordi
  // stilhedsuret tikker i et interval, som ikke skal genstartes af hvert
  // tastetryk — det læser altid den nyeste tilstand gennem dem.
  useEffect(() => {
    stateRef.current = { draft, interim, hasAttachments: attachments.length > 0 };
    submitRef.current = submitText;
    toggleMicRef.current = onToggleMic;
  });

  // Al aktivitet nulstiller stilhedsuret: nye talte ord OG tastetryk.
  useEffect(() => {
    lastActivityRef.current = Date.now();
  }, [interim, draft]);

  /** Stop og send — dikteringens normale afslutning. */
  const stopAndSend = useCallback(() => {
    const { draft: kladde, interim: rest } = stateRef.current;
    const gap = kladde && !kladde.endsWith(" ") && rest ? " " : "";
    setCountdown(null);
    toggleMicRef.current();
    submitRef.current(kladde + gap + rest);
  }, []);

  /** Stop UDEN at sende. Teksten bliver stående i feltet. */
  const cancelDictation = useCallback(() => {
    setCountdown(null);
    toggleMicRef.current();
  }, []);

  useEffect(() => {
    if (!listening) return;
    lastActivityRef.current = Date.now();
    const timer = window.setInterval(() => {
      const { interim: nu, draft: kladde, hasAttachments } = stateRef.current;
      // Interim der stadig ruller ind ER tale — også når teksten er uændret.
      if (nu) lastActivityRef.current = Date.now();
      if (!kladde.trim() && !hasAttachments) {
        setCountdown(null);
        return;
      }
      const silent = Date.now() - lastActivityRef.current;
      if (silent < SILENCE_BEFORE_WARN_MS) {
        setCountdown(null);
        return;
      }
      const remaining = SILENCE_BEFORE_WARN_MS + COUNTDOWN_MS - silent;
      if (remaining <= 0) {
        window.clearInterval(timer);
        stopAndSend();
      } else {
        setCountdown(Math.ceil(remaining / 1000));
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, [listening, stopAndSend]);

  // Escape fortryder dikteringen, uanset hvor fokus er.
  useEffect(() => {
    if (!listening) return;
    const onEsc = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelDictation();
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [listening, cancelDictation]);

  /** Mikrofon-klikket: start, eller stop-og-send når der er noget at sende. */
  const onMicClick = () => {
    if (listening && (draft.trim() || interim.trim() || attachments.length > 0)) {
      stopAndSend();
      return;
    }
    setCountdown(null);
    onToggleMic();
  };

  /*
   * Feltets typografi står ÉT sted. Spøgelseslaget, målelaget og selve
   * textarea'en skal bryde linjerne på nøjagtig samme sted — ellers ville den
   * foreløbige tale stå forskudt i forhold til de ord den fortsætter.
   */
  /*
   * På en telefon er `text-lg` for stort til indgangsfeltet: pladsholderen
   * fylder tre linjer på 360 px, og feltet bliver et afsnit i stedet for en
   * linje. Skalaen falder derfor ét trin under sm og er uændret derover.
   */
  const fieldType = compact
    ? "whitespace-pre-wrap break-words px-3.5 py-3 text-base leading-relaxed font-normal tracking-normal sm:px-4 sm:text-[15px]"
    : "whitespace-pre-wrap break-words px-4 py-3.5 text-base leading-relaxed font-normal tracking-normal sm:px-5 sm:py-4 sm:text-lg";

  // Mellemrummet mellem det skrevne og det talte. Uden det ville spøgelset
  // klistre sig til sidste bogstav.
  const ghostGap = draft && !draft.endsWith(" ") ? " " : "";

  /* ------------------------------------------------------------------ *
   * Feltet — delt mellem indgangsskærmen og komposeren
   * ------------------------------------------------------------------ */
  const fieldBox = (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      /*
        Feltet skal LIGNE et felt. På det hvide kort forsvandt en flade i
        papirfarve — så nu er den hvid med en hårfin kant og en indvendig
        skygge, det ældste tegn på "her kan skrives" der findes. Cursoren
        siger det samme: tekstmarkør over hele fladen, ikke kun over linjen.

        I komposeren har feltet INGEN egen ramme. Kortet udenom er allerede en
        ramme, og to rammer om det samme felt ser ud som en fejl — det var
        præcis dét den tykke fokusramme forstærkede. Dér markerer kortet fokus
        for hele komposeren; feltet og værktøjslinjen er ét element.
      */
      className={`cursor-text rounded-xl ${
        compact
          ? ""
          : "field-shell bg-[var(--paper-raised)] [--field-shadow:inset_0_1px_4px_rgba(16,32,30,0.07)]"
      } ${dragging ? "is-dragging bg-[var(--teal-tint)]" : ""}`}
      onClick={() => areaRef.current?.focus()}
    >
      <div className="relative">
        {/*
          Målelaget. Det er det eneste af de tre lag der fylder noget, og
          derfor det der bestemmer højden. Det måler på BÅDE det skrevne og
          det talte, så feltet allerede har gjort plads når ordene lander.

          Feltet starter som ÉN linje — det tomme lag indeholder præcis ét
          linjeskift — og vokser linje for linje med indholdet.
        */}
        {/*
          To målinger i samme celle; den højeste vinder.

          Pladsholderen står på ÉN linje på en bærbar og på to på en telefon.
          Målte vi kun på indholdet, ville feltet være én linje højt mens
          pladsholderen fyldte to — og på 390 px stod anden halvdel af
          "…eller send et billede" bag værktøjslinjen. Måler vi omvendt kun på
          pladsholderen, ville feltet KRYMPE i det øjeblik lægen skrev sit
          første bogstav. Cellen tager derfor begge og bruger den største, så
          feltet aldrig bliver lavere end det er nu — kun højere.
        */}
        <div aria-hidden="true" className="invisible grid">
          <div className={`col-start-1 row-start-1 ${fieldType}`}>
            {tr("intakePlaceholder", lang) + "\n"}
          </div>
          <div className={`col-start-1 row-start-1 ${fieldType}`}>
            {draft + ghostGap + interim + "\n"}
          </div>
        </div>

        {/*
          Spøgelseslaget: det opfangede, skrevet mens der tales.

          Det ligger UNDER textarea'en og gengiver det skrevne usynligt, så
          den foreløbige tale står præcis dér hvor den vil ende. Det er hele
          forskellen på "appen hørte noget" og "appen hørte DETTE".
        */}
        {interim && (
          <p aria-hidden="true" className={`pointer-events-none absolute inset-0 ${fieldType} text-[var(--ink)]`}>
            <span className="invisible">{draft + ghostGap}</span>
            <span className="text-[var(--teal)]">{interim}</span>
          </p>
        )}

        <textarea
          ref={areaRef}
          /* Genvejen «F» slår feltet op på id'et — se components/shortcuts.ts.
             De to udgaver af kortet står aldrig fremme samtidig, så id'et er
             entydigt. */
          id={INTAKE_FIELD_ID}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={onKeyDown}
          // Pladsholderen viger for det talte — ellers ville de to tekster
          // ligge oven i hinanden i det sekund mikrofonen fanger noget.
          placeholder={interim ? "" : tr("intakePlaceholder", lang)}
          autoFocus
          spellCheck={false}
          aria-label={tr("intakePlaceholder", lang)}
          /* Feltets egne genveje, annonceret frem for gemt: Enter sender,
             Shift+Enter giver en ny linje. Begge har altid virket — de har
             bare aldrig stået nogen steder. */
          aria-keyshortcuts="Enter Shift+Enter"
          className={`absolute inset-0 h-full w-full resize-none bg-transparent text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:outline-none ${fieldType}`}
        />
      </div>

      {attachments.length > 0 && (
        <ul className="flex flex-wrap gap-2.5 px-5 pb-1">
          {attachments.map((image) => (
            <li key={image.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- data-URL fra brugerens egen fil; next/image kan ikke optimere den */}
              <img
                src={image.previewUrl}
                alt={image.name ?? ""}
                className="h-20 w-20 rounded-lg border border-[var(--line)] object-cover"
              />
              <Tooltip label={tr("tipRemoveImage", lang)} placement="top-end" className="absolute -right-2 -top-2">
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== image.id))}
                  aria-label={tr("intakeRemoveImage", lang)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--paper-raised)] text-[var(--ink-soft)] shadow-sm transition-colors hover:border-[var(--teal)] hover:text-[var(--ink)]"
                >
                  <svg viewBox="0 0 20 20" width={12} height={12} fill="none" aria-hidden="true">
                    <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </Tooltip>
            </li>
          ))}
        </ul>
      )}

      {/* Værktøjslinjen er den række der rammes med en tommelfinger. Hver knap
          er derfor mindst 44 px høj — tommelfingerreglen — og linjen har lidt
          mindre luft udenom for at bære det uden at blive et bånd. */}
      <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-2 py-2 sm:px-3">
        <Tooltip label={tr("tipAddImage", lang)} placement="top-start">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex min-h-11 items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--teal-tint)] hover:text-[var(--teal-deep)]"
          >
            <svg
              viewBox="0 0 24 24"
              width={17}
              height={17}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
              <circle cx="8.6" cy="10" r="1.6" />
              <path d="m4 17 4.8-4.4a2 2 0 0 1 2.7 0L20 19.5" />
            </svg>
            <span className={compact ? "hidden sm:inline" : undefined}>
              <SizeLock variants={[tr("intakeAddImage", "da"), tr("intakeAddImage", "en")]}>
                {tr("intakeAddImage", lang)}
              </SizeLock>
            </span>
          </button>
        </Tooltip>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onPickFiles}
          className="hidden"
          tabIndex={-1}
        />

        <div className="flex items-center gap-2">
          {/*
            Komposerens mikrofon: samme tre tilstande som den store — klar,
            åbner, lytter — blot i værktøjslinjens størrelse. Samtalen er i
            gang, så mikrofonen skal ikke længere bære skærmen; den skal bare
            være dér hvor hånden allerede er.
          */}
          {compact && (
            <Tooltip
              label={tr(listening ? "tipMicStop" : "tipMicStart", lang)}
              keys={combo(SHORTCUT_KEYS.mic)}
              placement="top-end"
            >
              <button
                type="button"
                onClick={onMicClick}
                aria-pressed={listening}
                aria-busy={starting}
                aria-label={tr(listening ? "micStop" : "micStart", lang)}
                className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${
                  listening
                    ? "mic-breathe bg-[var(--teal)] text-white"
                    : starting
                      ? "bg-[var(--teal)] text-white"
                      : "bg-[var(--teal-deep)] text-white hover:bg-[var(--teal)]"
                }`}
              >
                {showCountdown !== null ? (
                  <span className="font-[family-name:var(--font-mono)] text-base font-bold">{showCountdown}</span>
                ) : (
                  <MicGlyph size={19} />
                )}
              </button>
            </Tooltip>
          )}

          <Tooltip label={tr("tipSend", lang)} keys={["Enter"]} placement="top-end">
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-[var(--teal)] px-4 py-2 text-[14px] font-semibold text-white transition-opacity disabled:opacity-25"
            >
              <SizeLock variants={[tr("intakeSend", "da"), tr("intakeSend", "en")]}>{tr("intakeSend", lang)}</SizeLock>
              <svg viewBox="0 0 20 20" width={15} height={15} fill="none" aria-hidden="true">
                <path
                  d="M4 10h11m0 0-4.5-4.5M15 10l-4.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );

  /* Fejl ved vedhæftning. Pladsen er reserveret, så feltet ikke rykker når en
     for stor fil afvises. Nude og ikke rød: en afvist fil er en hindring,
     ikke en klinisk alvor. */
  const errorLine = (
    <div className="mt-2 h-5">
      {attachError && (
        <p role="status" className="px-1 text-[13px] leading-5 text-[var(--nude-ink)]">
          {tr(attachError, lang)}
        </p>
      )}
    </div>
  );

  /*
    Vi spørger igen. Knapperne herunder er IKKE en menu forsiden tilbyder —
    de findes kun i det øjeblik vi selv har sagt at vi ikke kunne afgøre
    sagen, og forsvinder med det samme igen. Et valg som svar på vores egen
    tvivl er hjælp; et valg som udgangspunkt er forvirring.
  */
  const unresolvedBlock = unresolved && (
    <div className="motion-forward mb-4 rounded-xl border border-[var(--nude-deep)] bg-[var(--nude-tint)] px-4 py-3.5">
      <p role="status" aria-live="polite" className="text-sm font-medium leading-relaxed text-[var(--ink)]">
        {tr(ambiguous.length > 0 ? "intakeAmbiguous" : "intakeUnknown", lang)}
        <span className="mt-1 block font-normal text-[var(--ink-soft)]">&ldquo;{unresolved}&rdquo;</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(ambiguous.length > 0 ? trees.filter((tree) => ambiguous.includes(tree.id)) : trees).map((tree) => (
          <button
            key={tree.id}
            onClick={() => onSelectTree(tree.id)}
            className="flex min-h-11 items-center rounded-lg border border-[var(--line-strong)] bg-[var(--paper-raised)] px-3 py-1.5 text-[13px] font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)] hover:text-[var(--ink)]"
          >
            {/* `wrap`: forløbsnavnene kommer fra JSON og kan være lange. På
                360 px skal de bryde frem for at skubbe knappen ud af skærmen. */}
            <SizeLock wrap variants={[tree.name.da, tree.name.en]}>
              {tree.name[lang]}
            </SizeLock>
          </button>
        ))}
      </div>
    </div>
  );

  /* ------------------------------------------------------------------ *
   * Komposeren: samtalen har skærmen, indgangen er skrumpet til feltet
   * ------------------------------------------------------------------ */
  if (compact) {
    return (
      <div className="mx-auto max-w-3xl">
        {unresolvedBlock}
        <div className="field-shell rounded-2xl bg-[var(--paper-raised)] p-2 [--field-shadow:0_6px_24px_rgba(0,58,60,0.14)]">
          {fieldBox}
        </div>
        {errorLine}
      </div>
    );
  }

  /* ------------------------------------------------------------------ *
   * Indgangsskærmen: kortet med overskrift, felt og den store mikrofon
   * ------------------------------------------------------------------ */
  return (
    <div className="motion-fade mx-auto max-w-3xl">
      {/*
        Kortet fra det gamle layout: overskrift og hjælpetekst står i en
        indrammet, hævet flade i stedet for frit på gradienten. Feltet og
        mikrofonen bor i samme kort — det er ÉN samlet handling, og en ramme
        om halvdelen af den ville dele den i to.
      */}
      <div className="rounded-2xl border bg-[var(--paper-raised)] p-6 shadow-[var(--shadow-raised)] sm:p-8">
        <h2 className="font-[family-name:var(--font-display)] text-[28px] font-semibold leading-tight tracking-tight text-[var(--ink)] sm:text-[36px]">
          {tr("intakeQuestion", lang)}
        </h2>
        <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-soft)]">
          {tr("intakeHelp", lang)}
        </p>

        <div className="mt-6">{fieldBox}</div>
        {errorLine}

        {/* -------------------------------------------------------------- *
            Mikrofonen — det visuelle omdrejningspunkt. Alt andet er sekundært.
         * -------------------------------------------------------------- */}
        <div className="mt-6 flex flex-col items-center">
          <Tooltip
            label={tr(listening ? "tipMicStop" : "tipMicStart", lang)}
            keys={combo(SHORTCUT_KEYS.mic)}
            placement="top"
          >
          <button
            type="button"
            onClick={onMicClick}
            aria-pressed={listening}
            aria-busy={starting}
            aria-label={tr(listening ? "micStop" : "micStart", lang)}
            /*
              Fire tilstande, samme størrelse i alle fire, så knappen aldrig
              springer: klar, åbner, lytter — og varsler, hvor ikonet viger for
              nedtællingstallet. Knappen er ALTID fyldt — den er skærmens
              omdrejningspunkt og må ikke ligne en sekundær kontur-knap.
            */
            className={`relative flex h-[116px] w-[116px] items-center justify-center rounded-full shadow-[0_3px_12px_rgba(0,83,85,0.10)] transition-colors ${
              listening
                ? "mic-breathe bg-[var(--teal)] text-white"
                : starting
                  ? "bg-[var(--teal)] text-white"
                  : "bg-[var(--teal-deep)] text-white hover:bg-[var(--teal)]"
            }`}
          >
            {listening && (
              <>
                <span
                  className="zone-pulse-ring absolute inset-0 rounded-full border-2"
                  style={{ borderColor: "var(--teal)" }}
                />
                <span
                  className="zone-pulse-ring absolute inset-0 rounded-full border-2"
                  style={{ borderColor: "var(--teal)", animationDelay: "0.7s" }}
                />
              </>
            )}
            {showCountdown !== null ? (
              <span className="font-[family-name:var(--font-mono)] text-5xl font-bold">{showCountdown}</span>
            ) : (
              <MicGlyph size={50} />
            )}
          </button>
          </Tooltip>

          {/* Én linje, fast højde. Den skifter indhold — aldrig plads. */}
          <p aria-live="polite" className="mt-3 flex h-5 items-center gap-2 text-[13px] font-medium text-[var(--ink-soft)]">
            {showCountdown !== null ? (
              <>
                <span>
                  {tr("intakeMicCountdown", lang)} {showCountdown}…
                </span>
                <button
                  type="button"
                  onClick={cancelDictation}
                  className="rounded border border-[var(--line-strong)] px-1.5 py-px text-[11px] font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--teal)] hover:text-[var(--ink)]"
                >
                  {tr("intakeMicCancel", lang)}
                </button>
              </>
            ) : listening ? (
              tr("intakeMicListening", lang)
            ) : starting ? (
              tr("intakeMicStarting", lang)
            ) : (
              tr("intakeMicHint", lang)
            )}
          </p>
        </div>
      </div>

      {unresolvedBlock && <div className="mt-8">{unresolvedBlock}</div>}
    </div>
  );
}

/** Mikrofon-ikonet — ét motiv, to størrelser, aldrig to tegninger. */
function MicGlyph({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
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
  );
}
