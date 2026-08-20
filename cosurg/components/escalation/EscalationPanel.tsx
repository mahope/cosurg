"use client";

import { useEffect, useState } from "react";
import type { AnsweredStep, Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { SourceCard } from "@/components/guide/SourceCard";
import type { EskalationSvar, LoestHandling } from "./types";

/**
 * ESKALATIONEN, SET FRA BEGGE SIDER.
 *
 * Appens eskalering sagde indtil nu ét: ring til vagthavende brandsårslæge på
 * 35 45 12 45. Det er rigtigt for den yngre læge på en skadestue klokken tre om
 * natten. Det er cirkulært for specialisten — for hun ER den vagthavende, og
 * rådet beder hende ringe til sig selv. Og det er netop dér, i inhalationsskade,
 * cirkulær forbrænding, elektrisk skade og stort areal, at hun har mest brug for
 * de konkrete trin.
 *
 * Panelet holder derfor BEGGE roller åbne på én gang. Det er med vilje ikke en
 * indstilling og ikke en knap man skal finde: en rolle man skal vælge, er en
 * rolle man skal vælge FORKERT én gang, og prisen for det betales af en patient.
 * Begge tekster står der bare, og handlingstrinnene nedenunder er de samme for
 * dem begge — det er hvem der beslutter, der er forskellen, ikke hvad kilderne
 * siger.
 *
 * Telefonnummeret bliver stående. "Konferér ved tvivl" er selv en klinisk
 * anbefaling fra kilderne; det her supplerer den, det erstatter den ikke.
 */

interface EscalationPanelProps {
  treeId: string;
  /** Sat = fuldt panel med roller og handlingstrin. Udeladt = kun opslags-grebet. */
  dispositionId?: string;
  /** Noden et rødt flag sprang på — bruges til at finde flagets eget opslag. */
  nodeId?: string;
  /** Værdien flaget sprang på. */
  value?: string;
  /** Den besvarede sti. Afgør hvilke handlingstrin der gælder denne patient. */
  path?: AnsweredStep[];
  lang: Lang;
  /**
   * "Uddyb fra kilderne". Ordlyden kommer fra træet, så lægen aldrig skal
   * opfinde et spørgsmål om det systemet lige har sagt.
   */
  onElaborate?: (question: string) => void;
}

export function EscalationPanel({
  treeId,
  dispositionId,
  nodeId,
  value,
  path,
  lang,
  onElaborate,
}: EscalationPanelProps) {
  /*
   * Svaret bærer sin egen nøgle med.
   *
   * Nøglen er hele forespørgslen — træ, disposition, node, værdi, sti, sprog.
   * Uden den ville et nyt rødt flag i samme tur nå at vise det FORRIGE flags
   * opslag i et øjeblik, og et greb der peger på noget andet end det der står,
   * er værre end intet greb. At nøglen ligger i selve tilstanden gør desuden at
   * effekten aldrig behøver nulstille noget: er nøglen en anden end den vi
   * beder om nu, er svaret pr. definition forældet.
   */
  const [resultat, setResultat] = useState<{
    noegle: string;
    svar: EskalationSvar | null;
    fejlet: boolean;
  } | null>(null);

  /* Selve forespørgslen ER nøglen. Den bygges én gang og bruges tre steder:
     som afhængighed, som krop og som mærkat på svaret. */
  const noegle = JSON.stringify({
    treeId,
    dispositionId,
    nodeId,
    value,
    lang,
    path: (path ?? []).map((s) => ({ nodeId: s.nodeId, value: s.value })),
  });

  useEffect(() => {
    const ctrl = new AbortController();

    fetch("/api/guide/escalation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: noegle,
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? (r.json() as Promise<EskalationSvar>) : Promise.reject(new Error(String(r.status)))))
      .then((hentet) => setResultat({ noegle, svar: hentet, fejlet: false }))
      .catch(() => {
        if (!ctrl.signal.aborted) setResultat({ noegle, svar: null, fejlet: true });
      });

    return () => ctrl.abort();
  }, [noegle]);

  const aktuelt = resultat?.noegle === noegle ? resultat : null;
  const svar = aktuelt?.svar ?? null;
  const fejlet = aktuelt?.fejlet ?? false;

  const harRoller = !!svar?.roles;
  const harOpslag = !!svar?.lookup && !!onElaborate;

  // Intet fra træet til dette sted: så står der intet. En tom ramme ville
  // påstå at der var noget at hente.
  if (!svar && !fejlet) return dispositionId ? <Venter lang={lang} /> : null;
  if (fejlet) return dispositionId ? <Fejl lang={lang} /> : null;
  if (!harRoller && !harOpslag) return null;

  // Kun grebet — det røde flag midt i et forløb, hvor anbefalingen endnu
  // ikke er faldet.
  if (!harRoller) {
    return (
      <div className="mt-3">
        <ElaborateButton lookup={svar!.lookup!} onElaborate={onElaborate!} />
      </div>
    );
  }

  const roles = svar!.roles!;

  return (
    <section className="mt-4 rounded-xl border border-[var(--line-strong)] bg-[var(--paper)] p-4 sm:p-5">
      <p className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
        {tr("escalationTitle", lang)}
      </p>

      {/*
        De to roller. Begge er synlige samtidig og har samme vægt — ingen af
        dem er "den normale". Mærkatet foran hver er det der gør teksten
        entydig på et halvt sekund: læger skimmer, og et råd man skal læse to
        gange for at vide om det gælder én, er et råd man springer over.
      */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <RoleBlock label={tr("escalationCalling", lang)} text={roles.calling} />
        <RoleBlock label={tr("escalationReceiving", lang)} text={roles.receiving} accent />
      </div>

      {svar!.actions.length > 0 && (
        <div className="mt-5">
          <p className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            {tr("escalationActions", lang)}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-soft)]">
            {tr("escalationActionsNote", lang)}
          </p>
          <ol className="mt-3 space-y-2.5">
            {svar!.actions.map((a, i) => (
              <ActionItem key={a.id} handling={a} nummer={i + 1} lang={lang} />
            ))}
          </ol>
        </div>
      )}

      {harOpslag && (
        <div className="mt-4">
          <ElaborateButton lookup={svar!.lookup!} onElaborate={onElaborate!} />
        </div>
      )}
    </section>
  );
}

/** Én rolle. Mærkatet står først, så det er entydigt hvem teksten taler til. */
function RoleBlock({ label, text, accent = false }: { label: string; text: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-lg border p-3.5 ${
        accent ? "border-[var(--teal)] bg-[var(--teal-tint)]" : "border-[var(--line)] bg-[var(--paper-raised)]"
      }`}
    >
      <p
        className={`font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] ${
          accent ? "text-[var(--teal-deep)]" : "text-[var(--ink-faint)]"
        }`}
      >
        {label}
      </p>
      <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--ink)]">{text}</p>
    </div>
  );
}

/**
 * Ét handlingstrin.
 *
 * Overskriften og detaljen er VORES omskrivning af instruksen — samme skel som
 * på faldgrube-kortene. Kilden står altid; det ordrette belæg foldes ud, fordi
 * seks udfoldede uddrag er en side man scroller forbi i stedet for at handle på.
 * Kan vidensbasen ikke belægge trinnet, siges det med rene ord.
 */
function ActionItem({ handling, nummer, lang }: { handling: LoestHandling; nummer: number; lang: Lang }) {
  const [aabent, setAabent] = useState(false);

  return (
    <li className="rounded-lg border border-[var(--line)] bg-[var(--paper-raised)] p-3.5">
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--teal-tint)] font-[family-name:var(--font-mono)] text-[11px] font-semibold text-[var(--teal-deep)]"
        >
          {nummer}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-[15px] font-semibold leading-snug text-[var(--ink)]">{handling.title}</h4>
          <p className="mt-1 text-[14px] leading-relaxed text-[var(--ink-soft)]">{handling.detail}</p>
          <p className="mt-1.5 font-[family-name:var(--font-mono)] text-[11px] leading-relaxed text-[var(--ink-faint)]">
            {tr("escalationSource", lang)}: {handling.source}
          </p>
        </div>
      </div>

      <div className="mt-2.5 border-t border-[var(--line)] pt-2.5">
        {handling.coverage !== "ok" || !handling.evidence ? (
          <p className="text-[13px] leading-relaxed text-[var(--ink-soft)]">
            {tr(handling.coverage === "error" ? "sourceLookupFailed" : "sourceNoCoverage", lang)}
          </p>
        ) : aabent ? (
          <SourceCard uddrag={handling.evidence} lang={lang} tæt />
        ) : (
          <button
            type="button"
            onClick={() => setAabent(true)}
            className="-mx-2 -my-2 flex min-h-11 items-center rounded-lg px-2 font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--teal)] hover:underline"
          >
            {tr("sourceVerbatim", lang)} →
          </button>
        )}
      </div>
    </li>
  );
}

/**
 * "Uddyb fra kilderne" — ét greb, med en konkret ordlyd.
 *
 * Ordlyden kommer fra træet og nævner emnet ved navn, så lægen kan se hvad han
 * spørger om før han spørger. En generisk "Søg"-knap ville lægge arbejdet
 * tilbage hos ham: han skulle selv formulere spørgsmålet om det systemet lige
 * har sagt til ham.
 */
function ElaborateButton({
  lookup,
  onElaborate,
}: {
  lookup: { label: string; question: string };
  onElaborate: (question: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onElaborate(lookup.question)}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-[var(--line-strong)] bg-[var(--paper-raised)] px-3.5 py-2 text-left text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)]"
    >
      <span>{lookup.label}</span>
      <span aria-hidden="true" className="shrink-0 text-[var(--teal-deep)]">
        →
      </span>
    </button>
  );
}

function Venter({ lang }: { lang: Lang }) {
  return (
    <p
      role="status"
      className="mt-4 rounded-xl border border-dashed border-[var(--line-strong)] px-4 py-3 text-[13px] leading-relaxed text-[var(--ink-soft)]"
    >
      {tr("escalationLoading", lang)}
    </p>
  );
}

function Fejl({ lang }: { lang: Lang }) {
  return (
    <p className="mt-4 rounded-xl border border-dashed border-[var(--nude-deep)] bg-[var(--nude-tint)] px-4 py-3 text-[13px] leading-relaxed text-[var(--nude-ink)]">
      {tr("escalationFailed", lang)}
    </p>
  );
}
