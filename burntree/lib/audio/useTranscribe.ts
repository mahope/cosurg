"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CortiClient } from "@corti/sdk";
import type { Lang } from "@/lib/tree/types";

export interface TranscriptSegment {
  text: string;
  isFinal: boolean;
}

interface UseTranscribeOptions {
  lang: Lang;
  /** Kaldes hver gang en færdig ytring foreligger. */
  onFinal: (text: string) => void;
}

type SocketLike = {
  sendAudio: (chunk: ArrayBuffer | Uint8Array) => void;
  on: (event: string, handler: (payload: unknown) => void) => void;
  close: () => void;
};

/**
 * Mikrofon → MediaRecorder (webm/opus, understøttet af Corti) → transcribe-websocket.
 * Tokenet hentes fra vores egen proxy og er limited-scope, så klienten aldrig ser
 * client_secret eller et fuldadgangs-token.
 */
export function useTranscribe({ lang, onFinal }: UseTranscribeOptions) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<SocketLike | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    socketRef.current?.close();
    recorderRef.current = null;
    streamRef.current = null;
    socketRef.current = null;
    setListening(false);
    setInterim("");
  }, []);

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
          automaticPunctuation: true,
          interimResults: true,
          audioFormat: "audio/webm; codecs=opus",
        },
      })) as unknown as SocketLike;

      socket.on("message", (raw: unknown) => {
        const msg = raw as { type?: string; data?: { text?: string; isFinal?: boolean } };
        if (msg.type !== "transcript" || !msg.data?.text) return;
        if (msg.data.isFinal) {
          setInterim("");
          onFinalRef.current(msg.data.text);
        } else {
          setInterim(msg.data.text);
        }
      });

      socket.on("error", (err: unknown) => {
        setError(err instanceof Error ? err.message : "Transskriptionsfejl");
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
      // 250 ms pr. chunk — inden for Cortis anbefalede 100-250 ms.
      recorder.start(250);
      recorderRef.current = recorder;

      setListening(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke starte mikrofonen");
      stop();
    }
  }, [lang, stop]);

  return { listening, interim, error, start, stop };
}
