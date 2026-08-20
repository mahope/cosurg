"use client";

import { useEffect, useRef } from "react";

/**
 * Retningsbestemt bevægelse på det aktive kort.
 *
 * Skiftene i træet er ikke ens, og skærmen skal sige hvilket der skete:
 *   fremad    — et nyt spørgsmål kom til        → stiger op nedefra
 *   tilbage   — vi gik et trin tilbage          → glider ind fra venstre
 *   erstattet — samme trin, nyt indhold         → toner ind i skala
 *
 * Bevægelsen køres med Web Animations API frem for en CSS-klasse med `key`.
 * Grunden er praktisk: et `key`-skift ville montere kortet forfra og dermed
 * rive fokus ud af svarfeltet hver gang lægen svarede med tastaturet. Her
 * animeres den EKSISTERENDE knude, så fokus, markørposition og skrevet tekst
 * overlever skiftet.
 *
 * Indholdet er malet i sin endelige tilstand før animationen starter — falder
 * animationen bort (reduced motion, ældre browser), står trinnet korrekt med
 * det samme. Bevægelsen kan aldrig forsinke en beslutning.
 */
type Direction = "forward" | "back" | "replace";

const FRAMES: Record<Direction, Keyframe[]> = {
  forward: [
    { opacity: 0, transform: "translateY(10px)" },
    { opacity: 1, transform: "translateY(0)" },
  ],
  back: [
    { opacity: 0, transform: "translateX(-14px)" },
    { opacity: 1, transform: "translateX(0)" },
  ],
  replace: [
    { opacity: 0, transform: "scale(0.985)" },
    { opacity: 1, transform: "scale(1)" },
  ],
};

const DURATION: Record<Direction, number> = { forward: 240, back: 240, replace: 160 };

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useStepMotion<T extends HTMLElement>(stepNumber: number, nodeId: string | undefined) {
  const ref = useRef<T>(null);
  const previous = useRef<{ step: number; id: string | undefined } | null>(null);

  useEffect(() => {
    const last = previous.current;
    previous.current = { step: stepNumber, id: nodeId };

    // Første visning er ikke et skift — der var intet at skifte fra.
    if (!last) return;
    if (last.id === nodeId && last.step === stepNumber) return;

    const el = ref.current;
    if (!el || typeof el.animate !== "function") return;
    if (prefersReducedMotion()) return;

    const direction: Direction =
      stepNumber > last.step ? "forward" : stepNumber < last.step ? "back" : "replace";

    el.animate(FRAMES[direction], {
      duration: DURATION[direction],
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "none",
    });
  }, [stepNumber, nodeId]);

  return ref;
}
