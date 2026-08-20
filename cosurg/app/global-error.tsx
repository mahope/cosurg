"use client";

import { useEffect } from "react";

/**
 * Sidste udvej: rodlayoutet selv kastede.
 *
 * Denne fil ERSTATTER `layout.tsx`, og dermed forsvinder alt den satte op —
 * `<html>`-klassen med Roboto-variablerne, og dermed også de designtokens
 * resten af appen bygger på. Derfor er det den ENESTE fil i projektet hvor
 * farverne står som rå hex og typografien som en skriftstak: der findes ikke
 * en `var(--teal)` at slå op i her.
 *
 * Værdierne er kopieret fra `globals.css` og skal følge med hvis paletten
 * ændrer sig:  paper #fcf7f3 · ink #10292b · DarkGreen (tekstdyb) #3b757b ·
 * SurgeonBlue #005355 / #003a3c · LightBlue #dbe9ea.
 *
 * Ingen klinisk rød. Selv når alt er gået galt, er en teknisk fejl ikke en
 * klinisk alarm — og røde flag skal blive ved at betyde præcis én ting.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CoSurg] global", error);
  }, [error]);

  return (
    <html lang="da">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 16px",
          background: "#fcf7f3",
          color: "#10292b",
          fontFamily: "Roboto, system-ui, -apple-system, Segoe UI, sans-serif",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 560,
            background: "#ffffff",
            border: "1px solid #dbe9ea",
            borderRadius: 16,
            padding: 32,
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "'Roboto Mono', ui-monospace, monospace",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#55757a",
            }}
          >
            CoSurg
          </p>

          <h1 lang="da" style={{ margin: "20px 0 0", fontSize: 32, lineHeight: 1.15, letterSpacing: "-0.5px" }}>
            Appen kunne ikke starte
          </h1>
          <p lang="en" style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 500, color: "#3b757b" }}>
            The app could not start
          </p>

          <p lang="da" style={{ margin: "20px 0 0", lineHeight: 1.6 }}>
            Genindlæs siden. Der gemmes ingen patientdata, så intet er gået tabt — men et igangværende forløb
            skal startes forfra.
          </p>
          <p lang="en" style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.6, color: "#3b757b" }}>
            Reload the page. No patient data is stored, so nothing was lost — but an assessment in progress must
            be started again.
          </p>

          {error.message && (
            <p
              style={{
                margin: "20px 0 0",
                padding: "8px 12px",
                background: "#fcf7f3",
                border: "1px solid #dbe9ea",
                borderRadius: 8,
                fontFamily: "'Roboto Mono', ui-monospace, monospace",
                fontSize: 12,
                lineHeight: 1.5,
                color: "#55757a",
                overflowX: "auto",
              }}
            >
              {error.message}
              {error.digest ? ` (digest ${error.digest})` : ""}
            </p>
          )}

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 28,
              padding: "10px 18px",
              background: "#003a3c",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            Prøv igen · Try again
          </button>
        </div>
      </body>
    </html>
  );
}
