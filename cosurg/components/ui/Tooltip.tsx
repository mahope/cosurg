"use client";

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

/**
 * Hvor boblen lægger sig.
 *
 * `-start` og `-end` er ikke kosmetik: en centreret boble på en knap yderst
 * til højre stikker ud over skærmkanten og giver siden en vandret rullebjælke.
 * Knapper i højre side får derfor `-end` (boblen vokser indad mod venstre) og
 * knapper i venstre side `-start`. Kun midterstillede elementer bruger de rene
 * `top`/`bottom`.
 */
type Placement =
  | "top"
  | "top-start"
  | "top-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "right";

/**
 * En tastaturgenvej som den SKRIVES på tasterne. Hvert element er én tast;
 * flere elementer betyder "tryk samtidig" og sættes med et plus imellem.
 */
export type Keys = string[];

interface TooltipProps {
  /**
   * Hvad handlingen GØR. Ikke hvad knappen hedder — etiketten står allerede
   * på knappen, og en tooltip der gentager den er ren støj.
   */
  label: ReactNode;
  /** Tasterne der udløser handlingen. Vises som små tastekapsler i boblen. */
  keys?: Keys;
  placement?: Placement;
  /** OR-tilstandens mørke verden har sine egne farver. */
  tone?: "paper" | "or";
  /** Ekstra klasser på indpakningen — bruges når forælderen er et grid/flex. */
  className?: string;
  children: ReactElement;
}

/** Hvordan boblen placeres uden nogensinde at optage plads i layoutet. */
const PLACEMENT: Record<Placement, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  "top-start": "bottom-full left-0 mb-2",
  "top-end": "bottom-full right-0 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  "bottom-start": "top-full left-0 mt-2",
  "bottom-end": "top-full right-0 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

/**
 * En tastekapsel. Den bruges både i tooltips, i genvejsoversigten og i
 * håndfri tilstandens betjeningsbånd, så en tast ser ens ud overalt.
 */
export function Kbd({ children, tone = "paper" }: { children: ReactNode; tone?: "paper" | "or" }) {
  return (
    <kbd
      className={`inline-flex min-w-[1.4rem] items-center justify-center rounded border px-1.5 py-px font-[family-name:var(--font-mono)] text-[11px] font-medium leading-[1.45] ${
        tone === "or"
          ? "border-[var(--or-line)] bg-[var(--or-surface)] text-[var(--or-ink-soft)]"
          : "border-[var(--line-strong)] bg-[var(--paper-sunken)] text-[var(--ink-soft)]"
      }`}
    >
      {children}
    </kbd>
  );
}

/** Tasterne med plus imellem — "Shift + Enter", aldrig "ShiftEnter". */
export function KeyCombo({ keys, tone = "paper" }: { keys: Keys; tone?: "paper" | "or" }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1" aria-hidden="true">
      {keys.map((k, i) => (
        <span key={`${k}-${i}`} className="inline-flex items-center gap-1">
          {i > 0 && <span className={tone === "or" ? "text-[var(--or-ink-soft)]" : "text-[var(--ink-faint)]"}>+</span>}
          <Kbd tone={tone}>{k}</Kbd>
        </span>
      ))}
    </span>
  );
}

/** W3C-notationen til `aria-keyshortcuts`: "Shift+Enter", "Control+M". */
function ariaKeyshortcuts(keys: Keys): string {
  return keys
    .map((k) => (k.length === 1 ? k.toUpperCase() : k))
    .join("+");
}

/**
 * Forklarende tooltip med genvejen ved siden af.
 *
 * Tre ting bærer den, og alle tre er krav og ikke pynt:
 *
 * 1. DEN VIRKER UDEN MUS. Den åbner både på hover og på tastaturfokus, så en
 *    læge der tabber sig gennem skærmen får samme forklaring som en der
 *    peger. Med mus vises den kun ved hover — et klik på en knap skal ikke
 *    efterlade en boble stående.
 *
 * 2. DEN LÆSES OP. Boblen står altid i DOM'en med `role="tooltip"` og er
 *    knyttet til knappen med `aria-describedby`; genvejen står desuden i
 *    `aria-keyshortcuts`, så en skærmlæser kan annoncere den. Var boblen
 *    fjernet mens den var skjult, ville beskrivelsen forsvinde med den.
 *
 * 3. DEN FLYTTER INTET. Boblen er absolut placeret uden for flowet og
 *    forsvinder ved at blive gennemsigtig, ikke ved at blive fjernet. Layoutet
 *    står derfor lige så stille som før tooltippen fandtes.
 */
export function Tooltip({ label, keys, placement = "top", tone = "paper", className, children }: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  const hide = useCallback(() => setOpen(false), []);

  // Escape lukker boblen. En tooltip der bliver hængende over det man
  // forsøger at læse, er værre end ingen tooltip.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hide]);

  if (!isValidElement(children)) return children;

  /*
   * En knap kan allerede have en beskrivelse — journalnotatets ventetid står
   * fx i sin egen linje og peges på med `aria-describedby`. Tooltippen lægger
   * sig TIL den frem for oven på den; ellers ville en tooltip fjerne viden i
   * stedet for at tilføje den.
   */
  const existing = (children.props as { "aria-describedby"?: string })["aria-describedby"];
  const described = cloneElement(children as ReactElement<Record<string, unknown>>, {
    "aria-describedby": existing ? `${existing} ${id}` : id,
    ...(keys ? { "aria-keyshortcuts": ariaKeyshortcuts(keys) } : {}),
  });

  return (
    <span
      ref={rootRef}
      className={`relative inline-flex ${className ?? ""}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={hide}
      /*
        Fokus åbner kun boblen når fokus KOM fra tastaturet. Ellers ville
        et almindeligt museklik på mikrofonen efterlade en forklaring
        stående midt i det lægen lige satte i gang.
      */
      onFocus={(e) => {
        const el = e.target as HTMLElement;
        setOpen(typeof el.matches === "function" ? el.matches(":focus-visible") : true);
      }}
      onBlur={hide}
    >
      {described}
      <span
        id={id}
        role="tooltip"
        /*
          `hidden sm:block`: en telefon har ingen musemarkør at holde stille,
          og en boble på 240 px har ingen plads at være i ved siden af en knap
          på en 360 px skærm. Beskrivelsen forsvinder ikke af den grund —
          `aria-describedby` peger stadig på teksten, og den læses op uanset
          om elementet er synligt.
        */
        className={`pointer-events-none absolute z-50 hidden w-max max-w-[15rem] rounded-lg border px-2.5 py-1.5 text-left text-[12px] font-medium leading-snug shadow-[var(--shadow-lifted)] transition-opacity duration-100 sm:block ${
          PLACEMENT[placement]
        } ${
          tone === "or"
            ? "border-[var(--or-line)] bg-[var(--or-surface-raised)] text-[var(--or-ink)]"
            : "border-[var(--line-strong)] bg-[var(--paper-raised)] text-[var(--ink)]"
        } ${open ? "opacity-100" : "opacity-0"}`}
      >
        <span className="block">{label}</span>
        {keys && (
          <span className="mt-1.5 flex items-center gap-1">
            <KeyCombo keys={keys} tone={tone} />
          </span>
        )}
      </span>
    </span>
  );
}
