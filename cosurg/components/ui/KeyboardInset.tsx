"use client";

import { useEffect } from "react";

/**
 * Måler hvor meget af skærmen telefonens tastatur dækker, og lægger tallet i
 * `--kb-inset` på :root.
 *
 * Hvorfor det er nødvendigt: når skrivefeltet får fokus på en telefon, skyder
 * tastaturet op over den nederste halvdel af skærmen — men LAYOUT-viewportet
 * er lige så højt som før. Alt der er fastgjort til bunden (komposeren i
 * chattråden) lander derfor BAG tastaturet, i præcis det sekund det skal
 * bruges. Der findes ingen CSS-enhed for "det tastaturet dækker"; `dvh`
 * hjælper ikke, for `visualViewport` er det eneste der ved det.
 *
 * Målingen: `innerHeight` er layout-viewportet, `visualViewport.height` er det
 * man faktisk kan se, og `offsetTop` er hvad der er rullet væk foroven. Det
 * der mangler nederst er tastaturet. Små udsving (browserens egen adresselinje
 * der glider op og ned) filtreres fra med en tærskel, så komposeren ikke
 * sitrer mens man ruller.
 *
 * Uden `visualViewport` — ældre browsere, desktop — sker der ingenting, og
 * variablen bliver stående på 0px. Komponenten tegner intet.
 */
export function KeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const root = document.documentElement;
    let last = 0;

    const measure = () => {
      const dækket = window.innerHeight - vv.height - vv.offsetTop;
      // Under 80 px er det adresselinjen eller en afrundingsfejl, ikke et
      // tastatur. Over: rund af til hele pixels, så værdien ikke ændrer sig
      // ved hver eneste scroll-hændelse.
      const inset = dækket > 80 ? Math.round(dækket) : 0;
      if (inset === last) return;
      last = inset;
      root.style.setProperty("--kb-inset", `${inset}px`);
    };

    measure();
    vv.addEventListener("resize", measure);
    vv.addEventListener("scroll", measure);
    return () => {
      vv.removeEventListener("resize", measure);
      vv.removeEventListener("scroll", measure);
      root.style.removeProperty("--kb-inset");
    };
  }, []);

  return null;
}
