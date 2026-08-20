interface FlagProps {
  country: "dk" | "gb";
  size?: number;
  className?: string;
}

/**
 * Kompakte flagikoner til sprogskifteren. Fælles 3:2-boks for begge flag så
 * de sidder pænt side om side i kontrolbåndet.
 */
export function Flag({ country, size = 20, className = "" }: FlagProps) {
  const height = Math.round((size * 2) / 3);
  return (
    <svg
      viewBox="0 0 30 20"
      width={size}
      height={height}
      className={`rounded-[3px] ${className}`}
      aria-hidden="true"
    >
      {country === "dk" ? (
        <>
          <rect width="30" height="20" fill="#C8102E" />
          <rect x="11" width="4" height="20" fill="#FFFFFF" />
          <rect y="8" width="30" height="4" fill="#FFFFFF" />
        </>
      ) : (
        <>
          <rect width="30" height="20" fill="#012169" />
          <path d="M0,0 L30,20 M30,0 L0,20" stroke="#FFFFFF" strokeWidth="4" />
          <path d="M0,0 L30,20 M30,0 L0,20" stroke="#C8102E" strokeWidth="2" />
          <path d="M15,0 V20 M0,10 H30" stroke="#FFFFFF" strokeWidth="6" />
          <path d="M15,0 V20 M0,10 H30" stroke="#C8102E" strokeWidth="3" />
        </>
      )}
    </svg>
  );
}
