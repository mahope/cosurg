import { getDisposition, getNode } from "@/lib/tree/engine";
import type { DecisionTree, Lang, SessionState } from "@/lib/tree/types";

/**
 * Det forud-formulerede opslag for det sted et gennemløb står.
 *
 * Lægen skal kunne bede om mere uden at formulere et helt spørgsmål — og uden
 * at der ligger en generisk "Søg"-knap og venter på at han selv finder på
 * emnet. Emnet KENDER vi: det er den node han står på, det røde flag der lige
 * sprang, eller anbefalingen han fik. Ordlyden er skrevet i træet ved siden af
 * det kliniske indhold, så den taler om netop det systemet lige har sagt.
 *
 * Rækkefølgen er fra det mest specifikke og ud: flaget slår noden, noden slår
 * anbefalingen. Findes der intet opslag for stedet, returneres null — så står
 * der ingen knap, i stedet for en der lover noget den ikke kan holde.
 */
export function stedetsOpslag(
  tree: DecisionTree,
  state: SessionState,
  lang: Lang,
  /** Et rødt flag står og venter på kvittering. Så er det FLAGETS emne der gælder. */
  viserFlag: boolean,
): { label: string; question: string } | null {
  const sidste = state.path[state.path.length - 1];

  if (viserFlag && sidste) {
    const node = getNode(tree, sidste.nodeId);
    const flag = (node?.redFlags ?? []).find(
      (f) => f.lookup && (f.when === "*" || f.when === sidste.value),
    );
    if (flag?.lookup) {
      return { label: flag.lookup.label[lang], question: flag.lookup.question[lang] };
    }
  }

  if (state.currentNodeId) {
    const node = getNode(tree, state.currentNodeId);
    if (node?.lookup) return { label: node.lookup.label[lang], question: node.lookup.question[lang] };
  }

  if (state.dispositionId) {
    const disp = getDisposition(tree, state.dispositionId);
    if (disp?.lookup) return { label: disp.lookup.label[lang], question: disp.lookup.question[lang] };
  }

  return null;
}
