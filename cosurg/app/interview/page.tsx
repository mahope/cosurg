import type { Metadata } from "next";
import { InterviewView } from "@/components/interview/InterviewView";

export const metadata: Metadata = {
  title: "CoSurg — struktureret anamnese",
  description:
    "Fortæl om patienten med stemmen. Skemaet fylder sig selv ud og viser hvad der stadig mangler at blive spurgt om — allergier, antikoagulantia, tetanus, tid siden skaden.",
};

export default function InterviewPage() {
  return <InterviewView />;
}
