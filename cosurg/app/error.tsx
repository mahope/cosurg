"use client";

import { useEffect } from "react";
import { Bilingual, MessagePage, PrimaryAction, SecondaryAction } from "@/components/ui/MessagePage";

/**
 * En rute kastede.
 *
 * Beskeden siger tre ting, i den rækkefølge en læge har brug for dem: at det
 * er appen og ikke ham der fejlede, at intet er gået tabt, og hvad han gør nu.
 * `reset()` genmonterer ruten uden at genindlæse siden — er fejlen forbigående
 * (et enkelt Corti-kald der faldt), er man tilbage i forløbet på et sekund.
 *
 * Den tekniske årsag står med, men småt og nederst: den er for os, ikke for
 * ham. Vi skjuler den ikke — en demo hvor man ikke kan se HVAD der gik galt,
 * er en demo man ikke kan redde på scenen.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Serveren logger allerede. Konsollen er stedet vi kan nå fra en telefon
    // med fjernfejlfinding, hvis den her rammer under generalprøven.
    console.error("[CoSurg]", error);
  }, [error]);

  const detail = error.digest ? `${error.message} (digest ${error.digest})` : error.message;

  return (
    <MessagePage titleKey="errorTitle" bodyKey="errorBody" detail={detail || null}>
      <PrimaryAction onClick={reset}>
        <Bilingual k="retry" />
      </PrimaryAction>
      <SecondaryAction href="/">
        <Bilingual k="goHome" />
      </SecondaryAction>
    </MessagePage>
  );
}
