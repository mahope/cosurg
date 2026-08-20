import type { Metadata } from "next";
import { PitfallsView } from "@/components/pitfalls/PitfallsView";

export const metadata: Metadata = {
  title: "CoSurg — faldgruber",
  description:
    "De fejl der koster mest i brandsårsbehandling, ordnet efter hvor i forløbet de sker. Hver faldgrube bærer det ordrette belæg fra CoSurgs kilder.",
};

export default function PitfallsPage() {
  return <PitfallsView />;
}
