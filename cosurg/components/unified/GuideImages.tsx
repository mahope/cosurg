"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import type { GuideBillede } from "@/content/dressing-images";
import type { Lang } from "@/lib/tree/types";

/**
 * Procedurefotos i et guideafsnit: en række små thumbnails der kan åbnes stort.
 *
 * Rammen er fast (aspect 3:4, som i StepImages — 64 af de 71 kliniske fotos er
 * portræt), så intet hopper når billederne lander; next/image lazy-loader og
 * nedskalerer selv. `object-contain` frem for `cover`: et klinisk foto må ikke
 * beskæres — det er fingerstillingen i kanten der er pointen.
 *
 * Lysbordet er med vilje primitivt: en knap der fylder skærmen, pil frem og
 * tilbage, Escape lukker. Ingen bibliotek, ingen animation der stjæler tid fra
 * en læge med hånden i en forbinding.
 */

interface GuideImagesProps {
  images: GuideBillede[];
  lang: Lang;
}

export function GuideImages({ images, lang }: GuideImagesProps) {
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

  const valgt = aaben === null ? null : images[aaben];

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {images.map((img, i) => (
          <button
            key={img.src}
            type="button"
            onClick={() => setAaben(i)}
            className="relative aspect-[3/4] w-[86px] shrink-0 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--paper)] transition-colors hover:border-[var(--teal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--teal)]"
            aria-label={img.alt[lang]}
          >
            <Image
              src={img.src}
              alt={img.alt[lang]}
              fill
              sizes="86px"
              className="object-contain"
            />
          </button>
        ))}
      </div>
      <p className="mt-1.5 font-[family-name:var(--font-mono)] text-[10px] text-[var(--ink-faint)]">
        {lang === "da" ? "Foto: " : "Photo: "}
        {images[0].credit}
      </p>

      {valgt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={valgt.alt[lang]}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-4"
          onClick={luk}
        >
          <div
            className="relative h-[min(78vh,900px)] w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={valgt.src}
              alt={valgt.alt[lang]}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-contain"
            />
          </div>
          <p
            className="mt-3 max-w-3xl text-center text-sm leading-relaxed text-white/90"
            onClick={(e) => e.stopPropagation()}
          >
            {valgt.alt[lang]}
            <span className="mt-1 block font-[family-name:var(--font-mono)] text-[10px] text-white/50">
              {lang === "da" ? "Foto: " : "Photo: "}
              {valgt.credit}
            </span>
          </p>
          <div
            className="mt-3 flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
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
