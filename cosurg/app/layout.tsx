import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

// Display: brugt til spørgsmål og overskrifter — teknisk, instrumentagtig karakter.
const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// Brødtekst/UI: optimeret til læsbarhed under tidspres.
const body = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Data/mono: koder, tidsstempler, transskript, diagnosekoder — samme konvention
// som et laboratoriesvar eller en monitor-udskrift.
const mono = IBM_Plex_Mono({
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
