import { SkeletonLine } from "@/components/ui/Skeleton";
import { BrandMark, BrandWatermark } from "@/components/BrandMark";

/**
 * Det første halve sekund.
 *
 * Skelettet har samme grundrids som det der kommer — mærke og titel øverst,
 * ét stort kort med et spørgsmål og et svarfelt, sidepanel til højre. Så
 * bliver indlæsningen en form der fyldes ud i stedet for et hop fra tomhed
 * til app, og siden skifter ikke højde når indholdet lander.
 *
 * Fladerne er brandets LightBlue. Ingen klinisk farve: at vente er ikke en
 * klinisk tilstand.
 */
export default function Loading() {
  return (
    <main
      className="relative min-h-screen bg-[var(--paper)] px-4 py-6 sm:px-6 sm:py-8"
      aria-busy="true"
      aria-label="CoSurg"
    >
      <BrandWatermark />

      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="mb-8 flex items-center gap-3">
          <BrandMark size={34} />
          <div className="space-y-2">
            <SkeletonLine w="7rem" h={16} />
            <SkeletonLine w="12rem" h={9} />
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border bg-[var(--paper-raised)] p-6 sm:p-7">
            <SkeletonLine w="4.5rem" h={9} />
            <div className="mt-4 space-y-2.5">
              <SkeletonLine w="82%" h={20} />
              <SkeletonLine w="54%" h={20} />
            </div>
            <div className="mt-6 space-y-2">
              <SkeletonLine w="66%" h={9} />
            </div>
            <div className="mt-7">
              <SkeletonLine w="100%" h={40} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border bg-[var(--paper-raised)] p-4">
              <SkeletonLine w="5.5rem" h={9} />
              <div className="mt-4 space-y-2">
                <SkeletonLine w="90%" h={8} />
                <SkeletonLine w="72%" h={8} />
              </div>
            </div>
            <div className="rounded-xl border bg-[var(--paper-raised)] p-4">
              <SkeletonLine w="5rem" h={9} />
              <div className="mt-4 space-y-2">
                <SkeletonLine w="84%" h={8} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
