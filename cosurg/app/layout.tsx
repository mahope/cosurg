import type { Metadata } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import "./globals.css";

/*
 * Roboto er PlastSurgeon-brandets skrift og bruges hele vejen igennem. Appen
 * har tre typografiske roller, men kun én familie:
 *   display — spørgsmål og overskrifter, Roboto i tunge vægte
 *   body    — UI og brødtekst, læsbar under tidspres
 *   mono    — Roboto Mono til data: koder, transskript, trin-tællere. Samme
 *             konvention som et laboratoriesvar, uden at forlade brandet.
 */
const display = Roboto({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const body = Roboto({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const mono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "CoSurg — klinisk beslutningsstøtte",
  description: "Stemmestyret beslutningsstøtte til brandsår. Corti Hack for Health 2026.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="da"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
