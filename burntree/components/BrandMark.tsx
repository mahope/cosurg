/**
 * PlastSurgeon-mærket: "S"'et.
 *
 * Designguiden bruger et stort "S" som grafisk element — som baggrund der giver
 * dybde, eller som ramme om billeder. Her bærer det IDENTITETEN, mens
 * zone-ringene (ZoneMark) bærer TILSTANDEN: lytter appen, hvor langt er vi.
 * De to motiver overlapper dermed ikke, og hver figur betyder præcis én ting.
 *
 * "S"'et bruges bevidst ikke som ramme om trinbillederne: et klinisk foto må
 * ikke maskeres — det er tit fingerstillingen i kanten der er pointen.
 */

interface BrandMarkProps {
  size?: number;
  /** Mørk flade (OR-tilstand) vender mærket om. */
  tone?: "light" | "or";
  className?: string;
}

export function BrandMark({ size = 34, tone = "light", className = "" }: BrandMarkProps) {
  const plate = tone === "or" ? "var(--or-accent)" : "var(--teal)";
  const letter = tone === "or" ? "var(--or-bg)" : "#ffffff";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" width={size} height={size}>
        <rect x="0" y="0" width="40" height="40" rx="11" fill={plate} />
        <text
          x="20"
          y="20"
          textAnchor="middle"
          dominantBaseline="central"
          fill={letter}
          fontFamily="var(--font-display)"
          fontWeight="700"
          fontSize="26"
        >
          S
        </text>
      </svg>
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
