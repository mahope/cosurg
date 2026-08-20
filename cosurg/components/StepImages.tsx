import type { Lang, StepImage } from "@/lib/tree/types";

interface StepImagesProps {
  images: StepImage[];
  lang: Lang;
  large?: boolean;
}

export function StepImages({ images, lang, large }: StepImagesProps) {
  if (images.length === 0) return null;

  if (large) {
    return (
      <div className="mt-8 grid gap-6" style={{ gridTemplateColumns: `repeat(${Math.min(images.length, 2)}, 1fr)` }}>
        {images.map((img) => (
          <figure key={img.src} className="overflow-hidden rounded-2xl border border-[var(--or-line)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.src} alt={img.caption?.[lang] ?? ""} className="w-full object-cover" />
            {img.caption?.[lang] && (
              <figcaption className="bg-[var(--or-surface)] px-4 py-2 font-[family-name:var(--font-mono)] text-sm text-[var(--or-ink-soft)]">
                {img.caption[lang]}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      {images.map((img) => (
        <figure key={img.src} className="overflow-hidden rounded-xl border bg-[var(--paper-raised)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.src} alt={img.caption?.[lang] ?? ""} className="w-full object-cover" />
          {img.caption?.[lang] && (
            <figcaption className="px-3 py-2 text-xs text-[var(--ink-soft)]">{img.caption[lang]}</figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}
