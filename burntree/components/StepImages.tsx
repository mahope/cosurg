import Image from "next/image";
import type { Lang, StepImage } from "@/lib/tree/types";

interface StepImagesProps {
  images: StepImage[];
  lang: Lang;
  /**
   * OR-tilstand: billedet ER instruktionen. Det fylder den plads der er tilbage
   * på skærmen og skal kunne aflæses på to meters afstand.
   */
  large?: boolean;
  /** Skjuler billedet for skærmlæsere når teksten allerede siger det samme. */
  priority?: boolean;
}

/**
 * Trinbilleder fra Rigshospitalets step-by-step-guide.
 *
 * next/image bruges begge steder: den skalerer de 8,7 MB originaler ned til det
 * der faktisk vises, serverer AVIF/WebP, og — vigtigst i OR — reserverer
 * pladsen så skærmen ikke hopper når næste trin lander.
 *
 * `object-contain` frem for `cover`: et klinisk foto må ikke beskæres. Det er
 * fingerstillingen i kanten af billedet der er pointen.
 */
export function StepImages({ images, lang, large, priority }: StepImagesProps) {
  if (images.length === 0) return null;

  if (large) {
    // Fylder resten af OR-skærmen: flex-1 + min-h-0 så rækken krymper med
    // viewporten i stedet for at skubbe instruktionen ud over kanten.
    return (
      <div className="mt-6 flex min-h-0 flex-1 flex-col gap-3 sm:flex-row">
        {images.map((img, i) => (
          <figure
            key={img.src}
            className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--or-line)] bg-[var(--or-surface)]"
          >
            <div className="relative min-h-0 flex-1">
              <Image
                src={img.src}
                alt={img.caption?.[lang] ?? ""}
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-contain"
                priority={priority && i === 0}
              />
            </div>
            {img.caption?.[lang] && (
              <figcaption className="shrink-0 px-4 py-2 text-center font-[family-name:var(--font-mono)] text-base text-[var(--or-ink-soft)]">
                {img.caption[lang]}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      {images.map((img) => (
        <figure
          key={img.src}
          className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--paper)]"
        >
          {/* 64 af de 71 kliniske fotos er portræt — rammen følger flertallet,
              og object-contain sørger for at de syv liggende ikke beskæres. */}
          <div className="relative aspect-[3/4]">
            <Image
              src={img.src}
              alt={img.caption?.[lang] ?? ""}
              fill
              sizes="(max-width: 640px) 100vw, 240px"
              className="object-contain"
            />
          </div>
          {img.caption?.[lang] && (
            <figcaption className="px-3 py-2 text-xs text-[var(--ink-soft)]">{img.caption[lang]}</figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}
