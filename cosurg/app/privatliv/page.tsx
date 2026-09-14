import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark, BrandWatermark } from "@/components/BrandMark";
import { tr } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Privatliv",
  description: "Hvordan CoSurg behandler data: Corti API i EU, lokal samtalehistorik og cookieløs statistik.",
};

/*
 * Privatlivssiden. Rent dansk og statisk — appen er dansk, og teksten skal
 * kunne læses uden at appen kører. Rammen er den samme som Om & Team, så et
 * link hertil ikke føles som at forlade CoSurg.
 *
 * Fakta herunder kommer fra README (Corti-behandling), lib/history.ts (lokal
 * historik), lib/guard.ts (per-IP-kvote i hukommelsen) og
 * docs/ANALYTICS-EVENTS.md (Umami). Ret dem dér først, og så her.
 */
const h2 = "font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--ink)]";
const p = "mt-2 max-w-2xl text-sm leading-relaxed text-[var(--ink-soft)]";

export default function PrivatlivPage() {
  return (
    <main className="app-gradient-bg relative min-h-[100dvh] px-4 py-6 text-[var(--ink)] sm:px-6 sm:py-8">
      <BrandWatermark />
      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="shrink-0 transition-opacity hover:opacity-80">
              <BrandMark size={50} />
            </Link>
            <div>
              <Link href="/" className="transition-opacity hover:opacity-80">
                <h1 className="font-[family-name:var(--font-display)] text-[22px] font-semibold leading-tight tracking-tight text-[var(--ink)]">
                  {tr("title", "da")}
                </h1>
              </Link>
              <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--ink-faint)]">
                {tr("tagline", "da")}
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="rounded-lg border bg-[var(--paper-raised)] px-3 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)]"
          >
            ← {tr("aboutTeamBackLink", "da")}
          </Link>
        </header>

        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--ink)]">
          Privatliv
        </h2>
        <p className={p}>
          CoSurg er et klinisk beslutningsstøtteværktøj uden login. Her står, hvad der sker med det, du
          taler og skriver ind, og hvad vi måler. Sidst opdateret 14. september 2026.
        </p>

        <section className="mt-10">
          <h3 className={h2}>Ingen konto, ingen database</h3>
          <p className={p}>
            CoSurg har ingen brugerkonti og ingen database. Samtaler, transskripter, billeder og
            notater gemmes ikke på vores server. Din samtalehistorik gemmes kun lokalt i din egen
            browser (localStorage), aldrig hos os; billeder gemmes ikke i historikken. Du kan slette
            historikken fra historikpanelet i appen eller ved at rydde browserens data.
          </p>
          <p className={p}>
            For at beskytte tjenesten mod misbrug holder serveren en simpel kvote pr. IP-adresse i
            hukommelsen i op til ét minut. IP-adressen skrives ikke til en log eller en database.
          </p>
        </section>

        <section className="mt-10">
          <h3 className={h2}>Behandling hos Corti (EU)</h3>
          <p className={p}>
            Det, du siger og skriver, behandles af Cortis API i Cortis EU-miljø: tale bliver til tekst
            via Cortis transskription, udsagn, transskript, diktat, beslutningssti og eventuelle
            sårfotos sendes til Cortis modeller (ai.eu.corti.app) for triage, svar og journalnotat, og
            diagnosekoder hentes fra Cortis kodningsværktøj. Talt svar leveres af Syv.ai (EU-hostet)
            med den indbyggede browserstemme som reserve. Indtast ikke navn, CPR-nummer eller andre
            oplysninger, der kan identificere en patient — værktøjet har ikke brug for dem.
          </p>
        </section>

        <section className="mt-10">
          <h3 className={h2}>Statistik (Umami, cookieløs)</h3>
          <p className={p}>
            Vi måler, hvordan CoSurg bruges, med Umami, et open source-analyseværktøj, som Nordic
            Surgery Lab selv hoster på egen server i EU (analytics.nordicsurgerylab.com, hostet hos
            Hetzner Online GmbH, Tyskland). Det er cookieløst: intet gemmes på din enhed (ingen
            cookies, ingen localStorage), der er ingen sporing på tværs af sites, og din IP-adresse
            gemmes ikke. Et besøg identificeres kun ved en daglig roterende hash af IP-adresse,
            browser og website, som ikke kan føres tilbage til dig.
          </p>
          <p className={p}>
            Vi registrerer sidevisninger og anonyme produkthændelser som fx &quot;spørgsmål sendt&quot;
            eller &quot;beslutningstræ åbnet&quot; — aldrig persondata, fritekst, patientdata, e-mail
            eller bruger-id — og data deles ikke med tredjeparter. Retsgrundlaget er vores legitime
            interesse i aggregeret brugsstatistik (GDPR art. 6, stk. 1, litra f). Da intet gemmes på
            din enhed, kræves der ikke cookiesamtykke efter cookiebekendtgørelsen. Du kan gøre
            indsigelse mod behandlingen ved at kontakte os.
          </p>
        </section>

        <section className="mt-10">
          <h3 className={h2}>Kontakt</h3>
          <p className={p}>
            CoSurg drives af Nordic Surgery Lab. Spørgsmål og indsigelser rettes til Nordic Surgery Lab
            via{" "}
            <a
              href="https://nordicsurgerylab.com"
              className="underline hover:text-[var(--teal)]"
              rel="noopener noreferrer"
            >
              nordicsurgerylab.com
            </a>
            . Se også{" "}
            <Link href="/aboutandteam" className="underline hover:text-[var(--teal)]">
              Om &amp; Team
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
