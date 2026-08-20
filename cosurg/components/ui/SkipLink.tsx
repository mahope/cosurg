/**
 * Springet forbi kromindholdet.
 *
 * Instrumentpanelet øverst har sprogflag, forbrugspanel, stemmetilstand og
 * OR-knap — en håndfuld stop før man overhovedet når spørgsmålet. Med tastatur
 * (eller en fodkontakt/scanner-enhed, som er den realistiske håndfri reserve i
 * en skadestue) er det fem tabuleringer hver gang siden skifter.
 *
 * Linket er usynligt indtil det får fokus, og bliver så det tydeligste på
 * skærmen. Det er brandets farver, ikke kliniske: at springe i UI'et er ikke
 * en klinisk hændelse.
 */
export function SkipLink() {
  return (
    /*
      Linket ligger ude af flowet (`absolute`) og skubbet op over kanten, så det
      hverken fylder eller ses før det får fokus. Vi bruger bevidst IKKE
      `sr-only` + `focus:not-sr-only`: `not-sr-only` nulstiller polstringen, og
      linket ville da poppe frem som en nøgen tekststump uden knapflade.
      Her beholder det hele sin form og glider bare ind på plads.
    */
    <a
      href="#indhold"
      className="absolute left-4 top-4 z-50 -translate-y-20 rounded-lg bg-[var(--teal-deep)] px-4 py-2.5 text-sm font-semibold text-white opacity-0 shadow-[0_8px_24px_rgba(0,83,85,0.28)] transition-[transform,opacity] duration-150 focus:translate-y-0 focus:opacity-100"
    >
      <span lang="da">Gå til indholdet</span>
      <span aria-hidden="true"> · </span>
      <span lang="en">Skip to content</span>
    </a>
  );
}
