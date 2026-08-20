/**
 * Zone-ringe — appens visuelle signatur.
 *
 * Motivet er lånt direkte fra brandsårsklinikken: en forbrænding beskrives i
 * koncentriske zoner (koagulation → stase → hyperæmi), energi der taber sig
 * udad fra et centrum. Samme figur passer på lyd — en stemme der stråler ud
 * som ringe. Motivet bruges tre steder: som mærke i header, som
 * lytte-indikator, og som radial fremdrifts-ring i sidepanelet — så "hvor er
 * vi i samtalen" og "lytter appen lige nu" deler ét visuelt sprog.
 */

interface ZoneMarkProps {
  variant?: "mark" | "listening" | "progress";
  /** 0–100, kun for variant="progress". */
  percent?: number;
  /** Centrum-label, fx "3/8". */
  label?: string;
  active?: boolean;
  size?: number;
  tone?: "teal" | "or";
  className?: string;
}

export function ZoneMark({
  variant = "mark",
  percent = 0,
  label,
  active = false,
  size = 40,
  tone = "teal",
  className = "",
}: ZoneMarkProps) {
  const accent = tone === "or" ? "var(--or-accent)" : "var(--teal)";
  const faint = tone === "or" ? "var(--or-line)" : "var(--line-strong)";
  const r = 15.5;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {variant === "listening" && active && (
        <>
          <span
            className="zone-pulse-ring absolute inset-0 rounded-full border"
            style={{ borderColor: accent }}
          />
          <span
            className="zone-pulse-ring absolute inset-0 rounded-full border"
            style={{ borderColor: accent, animationDelay: "0.6s" }}
          />
        </>
      )}
      <svg viewBox="0 0 40 40" width={size} height={size}>
        {variant !== "progress" && (
          <circle cx="20" cy="20" r="18" fill="none" stroke={faint} strokeWidth="1" opacity="0.6" />
        )}
        <circle cx="20" cy="20" r="15.5" fill="none" stroke={faint} strokeWidth="1.25" />
        {variant === "progress" ? (
          <circle
            cx="20"
            cy="20"
            r={r}
            fill="none"
            stroke={accent}
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 20 20)"
          />
        ) : (
          <circle
            cx="20"
            cy="20"
            r="9.5"
            fill="none"
            stroke={accent}
            strokeWidth={variant === "listening" && active ? 2.5 : 1.5}
          />
        )}
        {variant !== "progress" && (
          <circle cx="20" cy="20" r={active && variant === "listening" ? 3.5 : 2.5} fill={accent} />
        )}
      </svg>
      {label && (
        <span
          className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-mono)] text-[10px] font-medium leading-none"
          style={{ color: tone === "or" ? "var(--or-ink)" : "var(--ink)" }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
