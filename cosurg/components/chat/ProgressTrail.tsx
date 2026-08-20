"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { progressLabel } from "./experts";
import type { Turn } from "./useClinicalChat";

/**
 * Livstegn mens agenten arbejder.
 *
 * Et svar tager målt 35-70 sekunder, fordi agenten faktisk går ud og henter
 * litteratur før den svarer. Uden fremdrift på skærmen ligner det en app der er
 * gået i stå — og på en scene foran dommere er det værre end et langsomt svar.
 * Vi viser derfor hvilken ekspert der arbejder lige nu, og hvor længe det har
 * varet. Ringene er appens tilstandssprog (zonefiguren), ikke pynt.
 */
export function ProgressTrail({ progress, lang }: { progress: Turn["progress"]; lang: Lang }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.round((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  const steps = progress.length > 0 ? progress : [{ expert: null, text: tr("chatSearching", lang) }];

  return (
    <div
      className="rounded-2xl border border-dashed bg-[var(--paper-raised)] px-5 py-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
          <span
            className="zone-pulse-ring absolute inset-0 rounded-full border"
            style={{ borderColor: "var(--turquoise)" }}
          />
          <span
            className="zone-pulse-ring absolute inset-0 rounded-full border"
            style={{ borderColor: "var(--turquoise)", animationDelay: "0.7s" }}
          />
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" />
        </span>
        <span className="text-[14px] font-medium text-[var(--ink)]">
          {progressLabel(steps[steps.length - 1].expert, steps[steps.length - 1].text, lang)}
        </span>
        <span className="ml-auto font-[family-name:var(--font-mono)] text-[12px] tabular-nums text-[var(--ink-faint)]">
          {seconds}s
        </span>
      </div>

      {steps.length > 1 && (
        <ul className="mt-2.5 space-y-1 border-t border-[var(--line)] pt-2.5">
          {steps.slice(0, -1).map((s, i) => (
            <li key={i} className="flex items-center gap-2 text-[12.5px] text-[var(--ink-faint)]">
              <svg viewBox="0 0 16 16" width="11" height="11" fill="none" aria-hidden="true">
                <path
                  d="M3 8.5 6.2 12 13 4.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {progressLabel(s.expert, s.text, lang)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
