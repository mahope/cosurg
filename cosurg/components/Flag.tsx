interface FlagProps {
  country: "dk" | "gb";
  /** Højde i px — bredden følger flagets egen proportion (dk 37:28, gb 2:1). */
  size?: number;
  className?: string;
}

const LABEL: Record<FlagProps["country"], string> = {
  dk: "Dansk",
  gb: "English",
};

/**
 * Flagikoner til sprogskifteren. Filerne ligger i public/flags/ (hentet fra
 * flagcdn.com) i stedet for håndtegnet SVG, så de matcher de officielle flag.
 */
export function Flag({ country, size = 20, className = "" }: FlagProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- statisk SVG, ingen fordel ved next/image-optimering
    <img
      src={`/flags/${country}.svg`}
      alt={LABEL[country]}
      height={size}
      className={`rounded-[2px] ${className}`}
      style={{ height: size, width: "auto" }}
    />
  );
}
