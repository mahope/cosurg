"use client";

import type { Lang } from "@/lib/tree/types";

/**
 * TTS via browserens SpeechSynthesis. Bevidst valg: har både da-DK og en-US indbygget,
 * kræver intet netværk, og kan derfor ikke fejle på venue-wifi under demoen.
 */
export function speak(text: string, lang: Lang): Promise<void> {
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

export function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
