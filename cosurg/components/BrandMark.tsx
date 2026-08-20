import Image from "next/image";

/**
 * PlastSurgeon-mærket: klinikkens logo.
 *
 * Bærer IDENTITETEN, mens zone-ringene (ZoneMark) bærer TILSTANDEN: lytter
 * appen, hvor langt er vi. De to motiver overlapper dermed ikke, og hver
 * figur betyder præcis én ting.
 *
 * Logoet bruges bevidst ikke som ramme om trinbillederne: et klinisk foto må
 * ikke maskeres — det er tit fingerstillingen i kanten der er pointen.
 */

interface BrandMarkProps {
  size?: number;
  /** Mørk flade (OR-tilstand) fremhæver mærket med en accent-ring. */
  tone?: "light" | "or";
  className?: string;
}

export function BrandMark({ size = 34, tone = "light", className = "" }: BrandMarkProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[22%] ${
        tone === "or" ? "ring-2 ring-[var(--or-accent)]" : ""
      } ${className}`}
      style={{ width: size, height: size }}
    >
      {/*
        Tom alt-tekst med vilje. Mærket står ALTID ved siden af ordet "CoSurg"
        — i instrumentpanelet, på fejlsiderne, i tillidsbadgen — og en alt-tekst
        ville få en skærmlæser til at sige navnet to gange i træk. Logoet er
        her identitet, ikke information.
      */}
      <Image
        src="/brand-mark.png"
        alt=""
        aria-hidden="true"
        width={256}
        height={256}
        className="h-full w-full object-cover"
      />
    </span>
  );
}

/** Det store "S" som baggrund — dybde og genkendelighed, aldrig indhold. */
export function BrandWatermark() {
  return (
    <span className="brand-watermark" aria-hidden="true">
      S
    </span>
  );
}
