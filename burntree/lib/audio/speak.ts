"use client";

import type { Lang } from "@/lib/tree/types";

/**
 * To-lags TTS:
 *   1. Netværks-TTS via /api/tts (bedre stemmekvalitet, især på dansk).
 *   2. Browserens SpeechSynthesis som fallback — virker offline og kan derfor
 *      ikke fejle på venue-wifi.
 *
 * Fallback udløses af manglende netværk, 501 (ingen provider konfigureret),
 * providerfejl eller timeout. Kliniske instruktioner må ALDRIG udeblive fordi
 * nettet svigter, så laget vælges automatisk uden at brugeren mærker det.
 */

let currentAudio: HTMLAudioElement | null = null;
/** Slås fra resten af sessionen når netværks-TTS har fejlet — undgår gentagne timeouts. */
let networkTtsDisabled = false;

const ttsCache = new Map<string, string>();

function browserSpeak(text: string, lang: Lang): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return resolve();

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "da" ? "da-DK" : "en-US";
    utterance.rate = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const match = voices.find((v) => v.lang.toLowerCase().startsWith(lang === "da" ? "da" : "en"));
    if (match) utterance.voice = match;

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

/** Henter lyden uden at afspille den. Returnerer null hvis netværks-TTS ikke kan bruges. */
async function fetchSpeech(text: string, lang: Lang): Promise<string | null> {
  if (networkTtsDisabled) return null;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return null;

  const key = `${lang}:${text}`;
  const cached = ttsCache.get(key);
  if (cached) return cached;

  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang }),
    });

    // 501 = ingen provider konfigureret. Slå fra permanent, brug browser-stemmen.
    if (res.status === 501) {
      networkTtsDisabled = true;
      return null;
    }
    if (!res.ok) return null;

    const url = URL.createObjectURL(await res.blob());
    ttsCache.set(key, url);
    return url;
  } catch {
    return null;
  }
}

function play(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error("afspilning fejlede"));
    void audio.play().catch(reject);
  });
}

export async function speak(text: string, lang: Lang): Promise<void> {
  stopSpeaking();
  const url = await fetchSpeech(text, lang);
  if (url) {
    try {
      await play(url);
      return;
    } catch {
      // Afspilning fejlede (fx autoplay-blokering) — fald tilbage til browser-stemmen.
    }
  }
  await browserSpeak(text, lang);
}

/** Forvarm cachen for en kommende ytring, så oplæsningen starter uden forsinkelse. */
export function prefetchSpeech(text: string, lang: Lang): void {
  void fetchSpeech(text, lang);
}

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
