import type { Metadata } from "next";
import { AboutTeamView } from "@/components/AboutTeamView";

export const metadata: Metadata = {
  title: "CoSurg — Om & Team",
  description: "Om CoSurg og holdet bag.",
};

export default function AboutTeamPage() {
  return <AboutTeamView />;
}
