interface FlagProps {
  country: "dk" | "gb";
  /** Højde i px — bredden er altid 4:3 af højden, ens for begge flag uanset deres egen proportion (dk 37:28, gb 2:1). */
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
 *
 * Dansk og britisk flag har hver deres egen proportion (37:28 hhv. 2:1) — uden
 * en fælles boks ville et klik på "det engelske flag" og "det danske flag"
 * ramme mærkbart forskellige knapstørrelser. Boksen er derfor låst til 4:3, og
 * object-fit: cover fylder den ens for begge flag.
 */
export function Flag({ country, size = 20, className = "" }: FlagProps) {
  const width = Math.round((size * 4) / 3);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- statisk SVG, ingen fordel ved next/image-optimering
    <img
      src={`/flags/${country}.svg`}
      alt={LABEL[country]}
      width={width}
      height={size}
      className={`rounded-[2px] object-cover ${className}`}
      style={{ width, height: size }}
    />
  );
}
