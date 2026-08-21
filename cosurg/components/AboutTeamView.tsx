"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { BrandMark, BrandWatermark } from "@/components/BrandMark";
import { LangSwitch } from "@/components/LangSwitch";

interface Member {
  name: string;
  role: string;
  img: string;
}

/**
 * Redaktionen/ekspertpanelet bag CoSurgs kliniske grundlag. Navne, roller og
 * portrætter er hentet fra Nordic Surgery Labs egen about-side (jpbrs-repoet)
 * — samme mennesker, samme billeder, lokalt hostet så de overholder appens CSP.
 */
const EXPERT_PANEL: Member[] = [
  { name: "Nicco Krezdorn", role: "Chief Surgeon, Zealand, Denmark", img: "/team/nicco-krezdorn.jpg" },
  { name: "Volker Schmidt", role: "Chief Surgeon, St. Gallen, Switzerland", img: "/team/volker-schmidt.jpg" },
  { name: "Lisbet Hölmich", role: "Professor, Herlev, Denmark", img: "/team/lisbet-holmich.jpg" },
  { name: "Tine Damsgaard", role: "Professor, Odense/Vejle, Denmark", img: "/team/tine-damsgaard.jpg" },
  { name: "Amir Bigdeli", role: "Chief Surgeon, Kassel, Germany", img: "/team/amir-bigdeli.jpg" },
  { name: "Åsa Edsander", role: "Consultant, Karolinska Institute, Stockholm, Sweden", img: "/team/asa-edsander.png" },
  { name: "Michael Rose", role: "Consultant, Zealand, Denmark", img: "/team/michael-rose.jpg" },
  { name: "Taiba Al-Rasheed", role: "Consultant, Zealand, Denmark", img: "/team/taiba-alrasheed.png" },
  { name: "Lisa Toft", role: "Consultant, Rigshospitalet, Copenhagen, Denmark", img: "/team/lisa-toft.jpg" },
  { name: "Emir Hasanbegovic", role: "Consultant, Amalieklinikken, Aarhus, Denmark", img: "/team/emir-hasanbegovic.jpg" },
  { name: "Rami Ibrahim", role: "Consultant, MURU Clinic, Copenhagen", img: "/team/rami-ibrahim.png" },
  { name: "Jais Oliver Berg", role: "Consultant, Herlev, Denmark", img: "/team/jais-oliver-berg.jpg" },
  { name: "Matilda Svenning", role: "Consultant, Zealand, Denmark", img: "/team/matilda-svenning.png" },
  { name: "Hans Henrik Rohden Nielsen", role: "Consultant, Aarhus, Denmark", img: "/team/hans-henrik-rohden-nielsen.jpg" },
  { name: "Hannah Trøstrup", role: "Consultant, Aleris, Denmark", img: "/team/hannah-trostrup.jpg" },
  { name: "Magnus Balslev Avnstorp", role: "Consultant, Zealand & Printzlau, Denmark", img: "/team/magnus-balslev-avnstorp.jpg" },
];

/**
 * "Our Team": redaktørerne, bidragyderne og skaberne der bygger og
 * vedligeholder Nordic Surgery Labs platforme. Hentet fra plastsurgeon-
 * repoets about-side (src/lib/team.ts, TEAM-arrayet).
 */
const OUR_TEAM: Member[] = [
  { name: "Magnus Balslev Avnstorp", role: "Founder, Project Manager, Editor", img: "/our-team/magnus-balslev-avnstorp.jpg" },
  { name: "Mia Demant, MD", role: "Certification training, MCQs", img: "/our-team/mia-demant.png" },
  { name: "Rami Ibrahim, MD, Specialist", role: "Surgical Videos", img: "/our-team/rami-ibrahim.png" },
  { name: "Christian Paaskesen, MD", role: "Illustrator, Case content, Journal", img: "/our-team/christian-paaskesen.jpeg" },
  { name: "Frederik Mamsen, MD, PhD", role: "Case Competition, Funding, Journal", img: "/our-team/frederik-mamsen.jpg" },
  { name: "Cammila Christiansen, MD", role: "Certification training, MCQs", img: "/our-team/cammila-christiansen.png" },
  { name: "Caroline Kümmel Skaarup", role: "SoMe, Instagram", img: "/our-team/caroline-kummel-skaarup.png" },
  { name: "Nizar Hamrouni, MD", role: "Surgical Videos", img: "/our-team/nizar-hamrouni.jpg" },
  { name: "Kristian Madsen", role: "", img: "/our-team/kristian-madsen.png" },
  { name: "Annika Gottholt Hansen, MD", role: "Database handling", img: "/our-team/annika-gottholt-hansen.jpg" },
  { name: "Christina Krogerus, MD", role: "Design, Flyers", img: "/our-team/christina-krogerus.png" },
  { name: "Tine Lorentzen", role: "Certification training, Videos", img: "/our-team/tine-lorentzen.jpeg" },
  { name: "Kattia Nguyen", role: "SoMe, Instagram, Illustrations", img: "/our-team/kattia-nguyen.jpg" },
  { name: "Julie Riemann", role: "SoMe, Instagram, Illustrations", img: "/our-team/julie-riemann.png" },
  { name: "Mads Holst Jensen", role: "Webudvikler", img: "/our-team/mads-holst-jensen.jpg" },
];

function TeamGrid({ members }: { members: Member[] }) {
  return (
    <ul className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
      {members.map((m) => (
        <li key={m.name} className="text-center">
          <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--paper-raised)] shadow-[var(--shadow-raised)]">
            <Image
              src={m.img}
              alt={m.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
            />
          </div>
          <p className="mt-3 text-sm font-medium leading-snug text-[var(--ink)]">{m.name}</p>
          {m.role && <p className="text-xs text-[var(--ink-faint)]">{m.role}</p>}
        </li>
      ))}
    </ul>
  );
}

/**
 * Om & Team. Rammen er den samme som resten af appen — mærke, skrift, vej
 * tilbage, sprogtoggle — så et link hertil aldrig føles som at forlade CoSurg.
 */
export function AboutTeamView() {
  const [lang, setLang] = useState<Lang>("da");

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
                  {tr("title", lang)}
                </h1>
              </Link>
              <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--ink-faint)]">
                {tr("tagline", lang)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="rounded-lg border bg-[var(--paper-raised)] px-3 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)]"
            >
              ← {tr("aboutTeamBackLink", lang)}
            </Link>
            <LangSwitch lang={lang} onToggleLang={() => setLang((l) => (l === "da" ? "en" : "da"))} />
          </div>
        </header>

        <p className="max-w-2xl text-sm leading-relaxed text-[var(--ink-soft)]">{tr("aboutTeamIntro", lang)}</p>

        <section className="mt-12">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--ink)]">
            {tr("aboutOurTeamTitle", lang)}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--ink-soft)]">{tr("aboutOurTeamIntro", lang)}</p>

          <TeamGrid members={OUR_TEAM} />
        </section>

        <section className="mt-14">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--ink)]">
            {tr("aboutTeamSectionTitle", lang)}
          </h2>
          {tr("aboutTeamSectionIntro", lang) && (
            <p className="mt-2 max-w-2xl text-sm text-[var(--ink-soft)]">{tr("aboutTeamSectionIntro", lang)}</p>
          )}

          <TeamGrid members={EXPERT_PANEL} />
        </section>

        {/*
          Firmaets underskrift. Den står i logoets egen tone og ikke i
          brødtekstens: navn og adresse er det ene sted på siden hvor CoSurg
          taler som virksomhed frem for som værktøj, og tonen er den samme
          man netop har set i mærket øverst.
        */}
        <footer className="mt-16 border-t border-[var(--line)] pt-6">
          <address className="not-italic text-sm leading-relaxed text-[var(--brand-mark)]">
            <span className="block font-medium">{tr("aboutAddressCompany", lang)}</span>
            <span className="block">{tr("aboutAddressStreet", lang)}</span>
            <span className="block">{tr("aboutAddressCity", lang)}</span>
          </address>
        </footer>
      </div>
    </main>
  );
}
