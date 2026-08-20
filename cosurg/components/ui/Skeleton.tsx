import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { ui } from "./uiText";

/**
 * Skeletter — ventetid der ligner det der kommer.
 *
 * En generisk spinner siger kun "vent". Et skelet siger "der kommer et notat,
 * det fylder så meget, og koderne står nederst" — og så føles de fjorten
 * sekunder som en form der bliver fyldt ud, ikke som en app der er gået i stå.
 *
 * Fladerne er brandets (LightBlue-tone). Klinisk rød, gul og grøn optræder
 * ALDRIG i et skelet: at vente er ikke en klinisk tilstand.
 */
export function SkeletonLine({ w = "100%", h = 10 }: { w?: string; h?: number }) {
  return <span className="skeleton block" style={{ width: w, height: h }} />;
}

/**
 * Journalnotatets skelet. Linjelængderne er sat efter et rigtigt notat fra
 * ruten: korte overskriftslinjer, lange brødtekstlinjer, luft mellem afsnit —
 * så det der lander ikke skubber siden.
 */
export function NoteSkeleton({ lang }: { lang: Lang }) {
  return (
    <div
      className="motion-fade rounded-2xl border border-[var(--line)] bg-[var(--paper-raised)] p-5 sm:p-6"
      role="status"
      aria-label={ui("noteSkeletonLabel", lang)}
    >
      {/* Overskriften er RIGTIG tekst, ikke en grå bjælke: den er det ene vi
          med sikkerhed ved om det der kommer, og den står præcis hvor notatets
          egen overskrift lander. Så er skelettet en form der fyldes ud frem for
          en grå plade man skal gætte på. */}
      <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink-faint)]">
        {tr("note", lang)}
      </p>

      <div aria-hidden="true">
        <div className="mt-4 space-y-2">
          <SkeletonLine w="7rem" h={9} />
          <SkeletonLine w="100%" h={9} />
          <SkeletonLine w="94%" h={9} />
          <SkeletonLine w="61%" h={9} />
        </div>

        <div className="mt-5 space-y-2">
          <SkeletonLine w="8.5rem" h={9} />
          <SkeletonLine w="97%" h={9} />
          <SkeletonLine w="88%" h={9} />
          <SkeletonLine w="72%" h={9} />
        </div>

        <div className="mt-6 pt-1">
          <SkeletonLine w="5rem" h={9} />
          <div className="mt-3 space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-1.5">
                <SkeletonLine w={i === 0 ? "68%" : "56%"} h={10} />
                <SkeletonLine w={i === 0 ? "84%" : "77%"} h={8} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
