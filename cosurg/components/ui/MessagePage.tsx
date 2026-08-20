import type { ReactNode } from "react";
import { BrandMark, BrandWatermark } from "../BrandMark";
import { both, t } from "@/lib/i18n";

interface MessagePageProps {
  /** Kort mærkat over overskriften — fx "404". Udelades ved fejl uden nummer. */
  badge?: string;
  titleKey: keyof typeof t;
  bodyKey: keyof typeof t;
  /** Teknisk detalje, kun når der ER en. Aldrig en tom ramme. */
  detail?: string | null;
  children?: ReactNode;
}

/**
 * Fejl- og tomme sider i brandet.
 *
 * To ting gør denne side klinisk frem for generisk:
 *
 * 1. **Begge sprog står der.** Siden ligger uden for appens sprogvælger —
 *    rammer man en død URL, er der ingen session der ved om man er dansk
 *    eller engelsk. Dommere, kirurger og tilskuere skal alle kunne læse den,
 *    så dansk står først og engelsk lige under, i samme sætning.
 *
 * 2. **Ingen klinisk farve.** En 404 er ikke en patient i fare. Rød, gul og
 *    grøn er reserveret til klinisk betydning (se globals.css), så en fejlside
 *    bæres af brandets teal og nude. Ser man rødt i CoSurg, betyder det noget.
 *
 * Og der er altid en vej tilbage. En fejlside uden udgang er en blindgyde midt
 * i en demo.
 */
export function MessagePage({ badge, titleKey, bodyKey, detail, children }: MessagePageProps) {
  const title = both(titleKey);
  const body = both(bodyKey);

  return (
    <main className="app-gradient-bg relative flex min-h-[100dvh] items-center justify-center px-4 py-12 text-[var(--ink)]">
      <BrandWatermark />

      <div className="motion-settle relative z-10 w-full max-w-xl rounded-2xl border bg-[var(--paper-raised)] p-7 shadow-[var(--shadow-raised)] sm:p-9">
        <div className="flex items-center gap-3">
          <BrandMark size={34} />
          <p className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            CoSurg
            {badge && <span className="ml-2 text-[var(--teal-deep)]">{badge}</span>}
          </p>
        </div>

        <h1
          lang="da"
          className="mt-6 font-[family-name:var(--font-display)] text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]"
        >
          {title.da}
        </h1>
        <p lang="en" className="mt-1 text-lg font-medium text-[var(--ink-soft)]">
          {title.en}
        </p>

        <p lang="da" className="mt-5 leading-relaxed text-[var(--ink)]">
          {body.da}
        </p>
        <p lang="en" className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
          {body.en}
        </p>

        {detail && (
          <p className="mt-5 overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 font-[family-name:var(--font-mono)] text-xs leading-snug text-[var(--ink-faint)]">
            <span className="font-semibold uppercase tracking-[0.14em]">{both("errorDetailLabel").da}</span>{" "}
            {detail}
          </p>
        )}

        <div className="mt-7 flex flex-wrap gap-2">{children}</div>
      </div>
    </main>
  );
}

/** Primær udvej. Brandets teal — aldrig klinisk grøn, selv om den er "den gode knap". */
export function PrimaryAction({ children, onClick, href }: { children: ReactNode; onClick?: () => void; href?: string }) {
  const cls =
    "inline-flex items-center rounded-lg bg-[var(--teal-deep)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--teal)]";
  return href ? (
    <a href={href} className={cls}>
      {children}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function SecondaryAction({ children, onClick, href }: { children: ReactNode; onClick?: () => void; href?: string }) {
  const cls =
    "inline-flex items-center rounded-lg border bg-[var(--paper-raised)] px-4 py-2.5 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)]";
  return href ? (
    <a href={href} className={cls}>
      {children}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

/** Begge sprog på én knap — siden ved ikke hvem der læser den. */
export function Bilingual({ k }: { k: keyof typeof t }) {
  const s = both(k);
  return (
    <>
      <span lang="da">{s.da}</span>
      <span aria-hidden="true" className="mx-1.5 opacity-40">
        ·
      </span>
      <span lang="en">{s.en}</span>
    </>
  );
}
