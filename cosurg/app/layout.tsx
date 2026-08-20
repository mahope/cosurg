import type { Metadata, Viewport } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { SkipLink } from "@/components/ui/SkipLink";
import { KeyboardInset } from "@/components/ui/KeyboardInset";

/*
 * Roboto er PlastSurgeon-brandets skrift og bruges hele vejen igennem. Appen
 * har tre typografiske roller, men kun én familie:
 *   display — spørgsmål og overskrifter, Roboto i tunge vægte
 *   body    — UI og brødtekst, læsbar under tidspres
 *   mono    — Roboto Mono til data: koder, transskript, trin-tællere. Samme
 *             konvention som et laboratoriesvar, uden at forlade brandet.
 *
 * `display: "swap"` er bevidst: skriften må aldrig kunne udsætte det første
 * spørgsmål. Falder Google Fonts væk på venue-wifi, står teksten i systemets
 * sans indtil Roboto lander — den beslutning bliver ikke langsommere af det.
 */
const display = Roboto({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});

const body = Roboto({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const mono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

/*
 * Linket bliver delt. Dommere sender det videre i Slack, Magnus og Rami åbner
 * det på en telefon på scenen, og en fane blandt tyve skal kunne findes på sit
 * ikon. Derfor et rigtigt kort — brandets "S", en sætning der siger hvad appen
 * er, og en påstand vi kan stå inde for.
 *
 * `metadataBase` er nødvendig for at og:image bliver en absolut URL. Uden den
 * peger kortet på et relativt sti-fragment, og forhåndsvisningen bliver tom
 * præcis dér hvor den skulle sælge.
 */
const SITE = "https://cosurg.com";
const DESCRIPTION =
  "Stemmestyret klinisk beslutningsstøtte til brandsår. Lægen taler, CoSurg fører gennem et klinisk valideret beslutningstræ, skriver journalnotatet og henter diagnosekoderne. Bygget på Corti.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "CoSurg — klinisk beslutningsstøtte til brandsår",
    template: "%s · CoSurg",
  },
  description: DESCRIPTION,
  applicationName: "CoSurg",
  authors: [{ name: "Magnus Avnstorp" }, { name: "Rami Mossad Ibrahim" }, { name: "Mads Holst Jensen" }],
  keywords: [
    "brandsår",
    "burns",
    "klinisk beslutningsstøtte",
    "clinical decision support",
    "Corti",
    "ambient scribe",
    "PlastSurgeon",
  ],
  /*
   * Fanens ikon kommer fra `app/favicon.ico` (Next's filkonvention) og er
   * klinikkens eget mærke. Her tilføjes kun det Apple-format iOS kræver når
   * nogen lægger demoen på hjemmeskærmen — samme mærke, rundede hjørner.
   */
  icons: {
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "CoSurg",
    locale: "da_DK",
    alternateLocale: ["en_GB"],
    title: "CoSurg — klinisk beslutningsstøtte til brandsår",
    description: DESCRIPTION,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "CoSurg — stemmestyret klinisk beslutningsstøtte til brandsår",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CoSurg — klinisk beslutningsstøtte til brandsår",
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

/*
 * Adresselinjens farve. SurgeonBlue i begge tilstande — OR-tilstand er en
 * tilstand kirurgen slår til, ikke operativsystemets mørke tema, så farven her
 * må ikke skifte med `prefers-color-scheme`.
 */
export const viewport: Viewport = {
  themeColor: "#005355",
  colorScheme: "light",
  /*
   * Telefonen er det mest realistiske device: appen ligger i kittellommen.
   * `width=device-width, initial-scale=1` er Next's standard og bevares.
   *
   * `viewportFit: "cover"` lader appen fylde HELE skærmen, også bag iPhones
   * afrundede hjørner — ellers står der to grå bjælker i landskab. Prisen er
   * at indholdet skal holdes fri af notch og hjemmeindikator selv; det gør
   * `body` (sidernes indryk) og de elementer der er fastgjort i bunden.
   *
   * Zoom spærres IKKE. En skadestuelæge skal kunne knibe et kildeuddrag op,
   * og `maximumScale: 1` ville tage den mulighed fra ham.
   */
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="da"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SkipLink />
        {/* Måler telefonens tastatur ind i --kb-inset. Tegner intet. */}
        <KeyboardInset />
        {/*
          Tastaturvejen ind i indholdet. `tabIndex={-1}` gør beholderen til et
          gyldigt fokusmål uden at lægge den i tabuleringsrækken — springet
          lander altså i indholdet, men skaber ikke et ekstra stop for den der
          tabulerer sig igennem normalt.
        */}
        <div id="indhold" tabIndex={-1} className="flex flex-1 flex-col focus:outline-none">
          {children}
        </div>
      </body>
    </html>
  );
}
