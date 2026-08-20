"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CortiClient } from "@corti/sdk";
import type { Lang } from "@/lib/tree/types";

/**
 * Cortis DICTATION-produkt — ikke det samme som den ambiente lytning.
 *
 * Begge lever på /transcribe-socket'en, men de konfigureres modsat:
 *
 *   ambient (lib/audio/useTranscribe.ts)   dictation (denne fil)
 *   automaticPunctuation: true             spokenPunctuation: true
 *   ingen commands                          commands: lægen styrer med stemmen
 *   ingen formatting                        formatting: tal og mål som i en journal
 *
 * Ambient lytter med mens lægen taler til patienten og skal selv gætte tegnsætning.
 * Dictation er enkelt-taler: lægen dikterer og siger selv "punktum", "nyt afsnit",
 * og kan afgive kommandoer midt i diktatet. Det er den rigtige tilstand til det
 * frie tillæg lægen selv formulerer til journalnotatet.
 *
 * Docs: /get_started/dictation, /api-reference/transcribe, /stt/punctuation
 */

export interface DictationCommandEvent {
  id: string;
  variables?: Record<string, string | null> | null;
}

interface UseDictationOptions {
  lang: Lang;
  /** Kaldes med hvert færdigt segment — klienten sammensætter selv teksten. */
  onFinal: (text: string) => void;
  /** Kaldes når lægen afgiver en stemmekommando (se DICTATION_COMMANDS). */
  onCommand?: (cmd: DictationCommandEvent) => void;
}

/**
 * Stemmekommandoer lægen kan bruge midt i diktatet. Holdt bevidst få: hver ekstra
 * frase er en ekstra mulighed for at en tilfældig sætning udløser en handling.
 *
 * ÆRLIGHEDSFORBEHOLD: Corti ACCEPTERER denne konfiguration (CONFIG_ACCEPTED), men
 * svarer `"registered": false` på hver kommando med vores hackathon-tenant — også
 * for engelske fraser og enkeltord. Kommandoer er altså ikke aktive for os, og vi
 * må ikke påstå at de er det. Koden er her fordi den er korrekt konfigureret og
 * virker i det øjeblik tenanten får rettigheden; onCommand er indtil da død kode.
 */
const DICTATION_COMMANDS = [
  {
    id: "scratch_that",
    phrases: [
      "slet sidste sætning",
      "slet det sidste",
      "scratch that",
      "delete that",
    ],
  },
  {
    id: "end_dictation",
    phrases: ["slut diktat", "diktat slut", "end dictation", "stop dictation"],
  },
];

type SocketLike = {
  sendAudio: (chunk: ArrayBuffer | Uint8Array) => void;
  sendFlush: (msg: { type: "flush" }) => void;
  sendEnd: (msg: { type: "end" }) => void;
  on: (event: string, handler: (payload: unknown) => void) => void;
  close: () => void;
};

export function useDictation({ lang, onFinal, onCommand }: UseDictationOptions) {
  const [dictating, setDictating] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<SocketLike | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const onFinalRef = useRef(onFinal);
  const onCommandRef = useRef(onCommand);
  useEffect(() => {
    onFinalRef.current = onFinal;
    onCommandRef.current = onCommand;
  }, [onFinal, onCommand]);

  const teardown = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    recorderRef.current = null;
    streamRef.current = null;
    socketRef.current = null;
    setDictating(false);
    setInterim("");
  }, []);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    const socket = socketRef.current;

    // MediaRecorder holder på lyd indtil næste timeslice. Uden requestData() går
    // den sidste halve sætning tabt — det er dokumenteret adfærd, ikke et uheld.
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.requestData();
      } catch {
        /* requestData kan kaste hvis optageren allerede er stoppet */
      }
      recorder.stop();
    }

    if (socket) {
      try {
        socket.sendFlush({ type: "flush" });
        socket.sendEnd({ type: "end" });
      } catch {
        /* socket kan allerede være lukket */
      }
      // Serveren lukker selv efter "ended"; close() her er en sikkerhedsline.
      setTimeout(() => socket.close(), 1500);
    }

    teardown();
  }, [teardown]);

  const start = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/corti/token");
      if (!res.ok) throw new Error("Kunne ikke hente Corti-token");
      const { token, environment } = (await res.json()) as {
        token: string;
        environment: string;
      };

      const client = new CortiClient({
        environment: environment as never,
        auth: { accessToken: token },
      });

      const socket = (await client.transcribe.connect({
        configuration: {
          primaryLanguage: lang,
          // Diktat: lægen siger selv "punktum" og "nyt afsnit". spokenPunctuation
          // og automaticPunctuation udelukker hinanden — kun én må være sat.
          spokenPunctuation: true,
          interimResults: true,
          commands: DICTATION_COMMANDS,
          formatting: {
            numbers: "numerals",
            measurements: "abbreviated",
            numericRanges: "numerals",
          },
          audioFormat: "audio/webm; codecs=opus",
        },
      })) as unknown as SocketLike;

      socket.on("message", (raw: unknown) => {
        const msg = raw as {
          type?: string;
          data?: {
            text?: string;
            isFinal?: boolean;
            id?: string;
            variables?: Record<string, string | null> | null;
          };
        };

        if (msg.type === "command" && msg.data?.id) {
          onCommandRef.current?.({ id: msg.data.id, variables: msg.data.variables });
          return;
        }

        if (msg.type !== "transcript" || !msg.data?.text) return;
        if (msg.data.isFinal) {
          setInterim("");
          onFinalRef.current(msg.data.text);
        } else {
          // Interim-tekst er ubehandlet: den indeholder stadig ordet "punktum"
          // og eventuelle kommandofraser. Vis den som forhåndsvisning, indsæt den aldrig.
          setInterim(msg.data.text);
        }
      });

      socket.on("error", (err: unknown) => {
        setError(err instanceof Error ? err.message : "Diktatfejl");
      });

      socketRef.current = socket;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0 && socketRef.current) {
          socketRef.current.sendAudio(await e.data.arrayBuffer());
        }
      };
      recorder.start(250);
      recorderRef.current = recorder;

      setDictating(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke starte diktat");
      teardown();
    }
  }, [lang, teardown]);

  return { dictating, interim, error, start, stop, commands: DICTATION_COMMANDS };
}
