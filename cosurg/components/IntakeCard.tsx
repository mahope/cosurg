"use client";

import { useCallback, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import type { TreeSummary } from "./TreePicker";
import { SizeLock } from "./ui/SizeLock";
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
  /** Foreløbig tale — det der opfanges LIGE NU, endnu ikke afsluttet. */
  interim: string;
  /** Teksten i feltet. Den bor hos forælderen, fordi genkendelsen læser den. */
  draft: string;
  onDraftChange: (text: string) => void;
  onToggleMic: () => void;
  onSubmit: (text: string, images?: ChatImage[]) => void;
  onSelectTree: (id: string) => void;
}

/**
 * FORSIDEN — og dermed produktet.
 *
 * CoSurg er en klinisk assistent man taler eller skriver til. Forsiden skal
 * derfor kunne bæres af to ting alene: ét stort felt og én stor mikrofon. Alt
 * andet blev fjernet med vilje — eksempelknapper, forløbsvælgere, faneblade og
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
 * 2. FELTET RUMMER EN HEL CASE. Det er en textarea der vokser med indholdet, så
 *    en beskrivelse på fem linjer ikke skal presses ned i en enkeltlinje. Den
 *    vokser NEDAD fra en fast minimumshøjde; overskriften og feltets top står
 *    stille uanset hvor meget der skrives.
 *
 * 3. BILLEDET FØLGER MED SPØRGSMÅLET. Et foto af såret er ofte det præcise
 *    spørgsmål — se attachments.ts for hvorfor det aldrig lander i et lager.
 *
 * Beslutningstræerne findes stadig og starter af sig selv når ytringen er en
 * patientbeskrivelse. Men de reklamerer ikke for sig selv her; forsiden lover
 * hjælp, ikke et værktøjsvalg.
 */
export function IntakeCard({
  lang,
  trees,
  ambiguous,
  unresolved,
  listening,
  interim,
  draft,
  onDraftChange,
  onToggleMic,
  onSubmit,
  onSelectTree,
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

  const submit = () => {
    if (!canSend) return;
    const text = draft.trim() || tr("intakeImageOnly", lang);
    const images = attachments.length > 0 ? toChatImages(attachments) : undefined;
    onSubmit(text, images);
    onDraftChange("");
    setAttachments([]);
    setAttachError(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sender, skift+enter giver en ny linje. En hel case skrives i
    // afsnit, og en textarea uden linjeskift ville være et inputfelt i
    // forklædning.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  /*
   * Feltets typografi står ÉT sted. Spøgelseslaget, målelaget og selve
   * textarea'en skal bryde linjerne på nøjagtig samme sted — ellers ville den
   * foreløbige tale stå forskudt i forhold til de ord den fortsætter.
   */
  const fieldType =
    "whitespace-pre-wrap break-words px-5 py-4 text-lg leading-relaxed font-normal tracking-normal";

  // Mellemrummet mellem det skrevne og det talte. Uden det ville spøgelset
  // klistre sig til sidste bogstav.
  const ghostGap = draft && !draft.endsWith(" ") ? " " : "";

  return (
    <div className="motion-fade mx-auto max-w-3xl">
      <div className="pt-6 text-center sm:pt-12">
        <h2 className="font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-tight text-[var(--ink)] sm:text-[42px]">
          {tr("intakeQuestion", lang)}
        </h2>
        <p className="mt-2.5 text-[15px] leading-relaxed text-[var(--ink-soft)]">{tr("intakeHelp", lang)}</p>
      </div>

      {/* ---------------------------------------------------------------- *
          Feltet
       * ---------------------------------------------------------------- */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`mt-7 rounded-2xl border bg-[var(--paper-raised)] shadow-[0_2px_14px_rgba(0,83,85,0.07)] transition-colors focus-within:border-[var(--teal)] focus-within:shadow-[0_2px_22px_rgba(0,83,85,0.13)] ${
          dragging ? "border-[var(--teal)] bg-[var(--teal-tint)]" : "border-[var(--line-strong)]"
        }`}
      >
        <div className="relative">
          {/*
            Målelaget. Det er det eneste af de tre lag der fylder noget, og
            derfor det der bestemmer højden. Det måler på BÅDE det skrevne og
            det talte, så feltet allerede har gjort plads når ordene lander.
            Det ekstra linjeskift holder den sidste linje synlig.
          */}
          <div aria-hidden="true" className={`invisible min-h-[10.5rem] ${fieldType}`}>
            {draft + ghostGap + interim + "\n"}
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
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={onKeyDown}
            // Pladsholderen viger for det talte — ellers ville de to tekster
            // ligge oven i hinanden i det sekund mikrofonen fanger noget.
            placeholder={interim ? "" : tr("intakePlaceholder", lang)}
            autoFocus
            spellCheck={false}
            aria-label={tr("intakePlaceholder", lang)}
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
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== image.id))}
                  aria-label={tr("intakeRemoveImage", lang)}
                  className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--paper-raised)] text-[var(--ink-soft)] transition-colors hover:border-[var(--teal)] hover:text-[var(--ink)]"
                >
                  <svg viewBox="0 0 20 20" width={12} height={12} fill="none" aria-hidden="true">
                    <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-4 py-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--teal-tint)] hover:text-[var(--teal-deep)]"
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
            <SizeLock variants={[tr("intakeAddImage", "da"), tr("intakeAddImage", "en")]}>
              {tr("intakeAddImage", lang)}
            </SizeLock>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onPickFiles}
            className="hidden"
            tabIndex={-1}
          />

          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-[var(--teal)] px-4 py-2 text-[14px] font-semibold text-white transition-opacity disabled:opacity-25"
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
        </div>
      </div>

      {/* Fejl ved vedhæftning. Pladsen er reserveret, så feltet ikke rykker
          når en for stor fil afvises. Nude og ikke rød: en afvist fil er en
          hindring, ikke en klinisk alvor. */}
      <div className="mt-2 h-5">
        {attachError && (
          <p role="status" className="px-1 text-[13px] leading-5 text-[var(--nude-deep)]">
            {tr(attachError, lang)}
          </p>
        )}
      </div>

      {/* ---------------------------------------------------------------- *
          Mikrofonen
       * ---------------------------------------------------------------- */}
      <div className="mt-5 flex flex-col items-center">
        <button
          type="button"
          onClick={onToggleMic}
          aria-pressed={listening}
          aria-label={tr(listening ? "micStop" : "micStart", lang)}
          className={`relative flex h-[88px] w-[88px] items-center justify-center rounded-full transition-colors ${
            listening
              ? "bg-[var(--teal)] text-white"
              : "border-2 border-[var(--teal)] bg-[var(--paper-raised)] text-[var(--teal-deep)] hover:bg-[var(--teal-tint)]"
          }`}
        >
          {listening && (
            <>
              <span className="zone-pulse-ring absolute inset-0 rounded-full border-2" style={{ borderColor: "var(--teal)" }} />
              <span
                className="zone-pulse-ring absolute inset-0 rounded-full border-2"
                style={{ borderColor: "var(--teal)", animationDelay: "0.7s" }}
              />
            </>
          )}
          <svg viewBox="0 0 24 24" width={38} height={38} fill="none" aria-hidden="true">
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

        {/* Én linje, fast højde. Den skifter indhold — aldrig plads. */}
        <p aria-live="polite" className="mt-3 flex h-5 items-center text-[13px] font-medium text-[var(--ink-soft)]">
          {listening ? tr("intakeMicListening", lang) : tr("intakeMicHint", lang)}
        </p>
      </div>

      {/*
        Vi spørger igen. Knapperne herunder er IKKE en menu forsiden tilbyder —
        de findes kun i det øjeblik vi selv har sagt at vi ikke kunne afgøre
        sagen, og forsvinder med det samme igen. Et valg som svar på vores egen
        tvivl er hjælp; et valg som udgangspunkt er forvirring.
      */}
      {unresolved && (
        <div className="motion-forward mt-8 rounded-xl border border-[var(--nude-deep)] bg-[var(--nude-tint)] px-4 py-3.5">
          <p role="status" aria-live="polite" className="text-sm font-medium leading-relaxed text-[var(--ink)]">
            {tr(ambiguous.length > 0 ? "intakeAmbiguous" : "intakeUnknown", lang)}
            <span className="mt-1 block font-normal text-[var(--ink-soft)]">&ldquo;{unresolved}&rdquo;</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(ambiguous.length > 0 ? trees.filter((tree) => ambiguous.includes(tree.id)) : trees).map((tree) => (
              <button
                key={tree.id}
                onClick={() => onSelectTree(tree.id)}
                className="rounded-lg border border-[var(--line-strong)] bg-[var(--paper-raised)] px-3 py-1.5 text-[13px] font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)] hover:text-[var(--ink)]"
              >
                <SizeLock variants={[tree.name.da, tree.name.en]}>{tree.name[lang]}</SizeLock>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
