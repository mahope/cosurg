"use client";

import { useCallback, useEffect, useState } from "react";
import type { TurnImage } from "@/components/attachments";
import type { Lang } from "@/lib/tree/types";

/**
 * FOTOET LÆGEN SPURGTE MED — set igen bagefter.
 *
 * Et spørgsmål med et billede er halvt uforståeligt uden billedet. "Hvad ser
 * du her?" siger ingenting ved siden af et svar, hvis fotoet forsvandt i det
 * sekund det blev sendt — så miniaturen bliver stående ved ytringen resten af
 * sessionen.
 *
 * Mekanikken er GuideImages': fast ramme så intet hopper når billedet lander,
 * `object-contain` fordi et klinisk foto ikke må beskæres (det er kanten der
 * er pointen), og et primitivt lysbord — fylder skærmen, pil frem og tilbage,
 * Escape lukker. Ingen animation, intet bibliotek.
 *
 * Til forskel fra GuideImages er kilden en data-URL fra lægens egen fil og
 * ikke en fil i /public. `next/image` kan hverken optimere eller lazy-loade
 * den, så her er `<img>` det rigtige — og miniaturen er i forvejen skaleret
 * ned til 320 px af `makePreview`, så der er intet at optimere.
 *
 * Miniaturen står højrestillet under ytringsboblen, fordi det er lægens egne
 * ord og hans eget billede: den samme side af tråden.
 */

interface TurnImagesProps {
  images: TurnImage[];
  lang: Lang;
}

export function TurnImages({ images, lang }: TurnImagesProps) {
  const [aaben, setAaben] = useState<number | null>(null);

  const luk = useCallback(() => setAaben(null), []);
  const flyt = useCallback(
    (retning: 1 | -1) =>
      setAaben((i) => (i === null ? null : (i + retning + images.length) % images.length)),
    [images.length],
  );

  useEffect(() => {
    if (aaben === null) return;
    const paaTast = (e: KeyboardEvent) => {
      if (e.key === "Escape") luk();
      if (e.key === "ArrowRight") flyt(1);
      if (e.key === "ArrowLeft") flyt(-1);
    };
    window.addEventListener("keydown", paaTast);
    return () => window.removeEventListener("keydown", paaTast);
  }, [aaben, luk, flyt]);

  if (images.length === 0) return null;

  const etiket = (img: TurnImage, i: number) =>
    img.name ?? `${lang === "da" ? "Vedhæftet foto" : "Attached photo"} ${i + 1}`;
  const valgt = aaben === null ? null : images[aaben];

  return (
    <div className="mt-2 flex flex-wrap justify-end gap-2">
      {images.map((img, i) => (
        <button
          key={img.url.slice(-32) + i}
          type="button"
          onClick={() => setAaben(i)}
          aria-label={`${lang === "da" ? "Vis stort" : "Open"}: ${etiket(img, i)}`}
          className="relative aspect-[3/4] w-[72px] shrink-0 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--paper)] transition-colors hover:border-[var(--teal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--teal)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- data-URL fra lægens egen fil; next/image kan ikke optimere den */}
          <img src={img.url} alt={etiket(img, i)} className="absolute inset-0 h-full w-full object-contain" />
        </button>
      ))}

      {valgt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={etiket(valgt, aaben ?? 0)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-4"
          onClick={luk}
        >
          <div className="relative h-[min(78vh,900px)] w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element -- se ovenfor */}
            <img
              src={valgt.url}
              alt={etiket(valgt, aaben ?? 0)}
              className="absolute inset-0 h-full w-full object-contain"
            />
          </div>
          <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => flyt(-1)}
                  className="min-h-11 rounded-lg border border-white/30 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10"
                  aria-label={lang === "da" ? "Forrige billede" : "Previous image"}
                >
                  ←
                </button>
                <span className="font-[family-name:var(--font-mono)] text-xs text-white/60">
                  {(aaben ?? 0) + 1} / {images.length}
                </span>
                <button
                  type="button"
                  onClick={() => flyt(1)}
                  className="min-h-11 rounded-lg border border-white/30 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10"
                  aria-label={lang === "da" ? "Næste billede" : "Next image"}
                >
                  →
                </button>
              </>
            )}
            <button
              type="button"
              onClick={luk}
              className="min-h-11 rounded-lg border border-white/30 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              {lang === "da" ? "Luk" : "Close"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
