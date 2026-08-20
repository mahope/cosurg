"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { BrandMark, BrandWatermark } from "@/components/BrandMark";

/**
 * Redaktionen/ekspertpanelet bag CoSurgs kliniske grundlag. Navne, roller og
 * portrætter er hentet fra Nordic Surgery Labs egen about-side (jpbrs-repoet)
 * — samme mennesker, samme billeder, lokalt hostet så de overholder appens CSP.
 */
const TEAM = [
  { name: "Nicco Krezdorn", role: "Chief Surgeon, Zealand, Denmark", img: "nicco-krezdorn.jpg" },
  { name: "Volker Schmidt", role: "Chief Surgeon, St. Gallen, Switzerland", img: "volker-schmidt.jpg" },
  { name: "Lisbet Hölmich", role: "Professor, Herlev, Denmark", img: "lisbet-holmich.jpg" },
  { name: "Tine Damsgaard", role: "Professor, Odense/Vejle, Denmark", img: "tine-damsgaard.jpg" },
  { name: "Amir Bigdeli", role: "Chief Surgeon, Kassel, Germany", img: "amir-bigdeli.jpg" },
  { name: "Åsa Edsander", role: "Consultant, Karolinska Institute, Stockholm, Sweden", img: "asa-edsander.png" },
  { name: "Michael Rose", role: "Consultant, Zealand, Denmark", img: "michael-rose.jpg" },
  { name: "Taiba Al-Rasheed", role: "Consultant, Zealand, Denmark", img: "taiba-alrasheed.png" },
  { name: "Lisa Toft", role: "Consultant, Rigshospitalet, Copenhagen, Denmark", img: "lisa-toft.jpg" },
  { name: "Emir Hasanbegovic", role: "Consultant, Amalieklinikken, Aarhus, Denmark", img: "emir-hasanbegovic.jpg" },
  { name: "Rami Ibrahim", role: "Consultant, MURU Clinic, Copenhagen", img: "rami-ibrahim.png" },
  { name: "Jais Oliver Berg", role: "Consultant, Herlev, Denmark", img: "jais-oliver-berg.jpg" },
  { name: "Matilda Svenning", role: "Consultant, Zealand, Denmark", img: "matilda-svenning.png" },
  { name: "Hans Henrik Rohden Nielsen", role: "Consultant, Aarhus, Denmark", img: "hans-henrik-rohden-nielsen.jpg" },
  { name: "Hannah Trøstrup", role: "Consultant, Aleris, Denmark", img: "hannah-trostrup.jpg" },
  { name: "Magnus Balslev Avnstorp", role: "Consultant, Zealand & Printzlau, Denmark", img: "magnus-balslev-avnstorp.jpg" },
];

/**
 * Om & Team. Rammen er den samme som resten af appen — mærke, skrift, vej
 * tilbage, sprogtoggle — så et link hertil aldrig føles som at forlade CoSurg.
 */
export function AboutTeamView() {
  const [lang, setLang] = useState<Lang>("da");

  return (
    <main className="relative min-h-screen bg-[var(--paper)] px-4 py-6 text-[var(--ink)] sm:px-6 sm:py-8">
      <BrandWatermark />
      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandMark size={34} />
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-[22px] font-semibold leading-tight tracking-tight text-[var(--ink)]">
                {tr("aboutTeam", lang)}
              </h1>
              <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--ink-faint)]">
                {tr("aboutTeamTagline", lang)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="rounded-lg border bg-[var(--paper-raised)] px-3 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)]"
            >
              ← {tr("toolTree", lang)}
            </Link>
            <button
              onClick={() => setLang((l) => (l === "da" ? "en" : "da"))}
              className="rounded-lg border bg-[var(--paper-raised)] px-3 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--teal)]"
            >
              {lang === "da" ? "Dansk" : "English"}
            </button>
          </div>
        </header>

        <p className="max-w-2xl text-sm leading-relaxed text-[var(--ink-soft)]">{tr("aboutTeamIntro", lang)}</p>

        <section className="mt-12">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--ink)]">
            {tr("aboutTeamSectionTitle", lang)}
          </h2>
          {tr("aboutTeamSectionIntro", lang) && (
            <p className="mt-2 max-w-2xl text-sm text-[var(--ink-soft)]">{tr("aboutTeamSectionIntro", lang)}</p>
          )}

          <ul className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {TEAM.map((m) => (
              <li key={m.name} className="text-center">
                <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--paper-raised)] shadow-[0_1px_2px_rgba(16,32,30,0.04)]">
                  <Image
                    src={`/team/${m.img}`}
                    alt={m.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover"
                  />
                </div>
                <p className="mt-3 text-sm font-medium leading-snug text-[var(--ink)]">{m.name}</p>
                <p className="text-xs text-[var(--ink-faint)]">{m.role}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
