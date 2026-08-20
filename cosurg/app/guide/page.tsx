import type { Metadata } from "next";
import { GuideView } from "@/components/guide/GuideView";

export const metadata: Metadata = {
  title: "CoSurg — behandlingsguide",
  description:
    "Slå en brandsårstilstand op og få behandlingen i klinisk rækkefølge. Hvert afsnit er ordret fra CoSurgs egne kilder og bærer sin kildehenvisning.",
};

export default function GuidePage() {
  return <GuideView />;
}
