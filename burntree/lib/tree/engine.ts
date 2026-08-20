import type {
  AnsweredStep,
  DecisionTree,
  Disposition,
  Lang,
  SessionState,
  TreeNode,
} from "./types";

export function getNode(tree: DecisionTree, id: string): TreeNode | undefined {
  return tree.nodes.find((n) => n.id === id);
}

export function getDisposition(tree: DecisionTree, id: string): Disposition | undefined {
  return tree.dispositions.find((d) => d.id === id);
}

export function startSession(tree: DecisionTree, lang: Lang): SessionState {
  return {
    treeId: tree.id,
    lang,
    currentNodeId: tree.rootNodeId,
    path: [],
    dispositionId: null,
    redFlags: [],
  };
}

/**
 * Matcher en svarværdi mod en kant-betingelse. Understøtter "*", eksakt match og
 * simple taludtryk: ">=20", "<10", "10-19".
 */
export function matches(when: string, value: string): boolean {
  if (when === "*") return true;
  if (when === value) return true;

  const num = Number(value);
  if (Number.isNaN(num)) return false;

  const range = when.match(/^(-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)$/);
  if (range) return num >= Number(range[1]) && num <= Number(range[2]);

  const cmp = when.match(/^(>=|<=|>|<|=)\s*(-?\d+(?:\.\d+)?)$/);
  if (cmp) {
    const bound = Number(cmp[2]);
    switch (cmp[1]) {
      case ">=":
        return num >= bound;
      case "<=":
        return num <= bound;
      case ">":
        return num > bound;
      case "<":
        return num < bound;
      case "=":
        return num === bound;
    }
  }
  return false;
}

export interface AdvanceResult {
  state: SessionState;
  /** Rødt flag udløst af dette svar — skal annonceres højt uanset stemmetilstand. */
  redFlag?: { message: string; nodeId: string };
}

/** Besvarer den aktuelle node og rykker frem. Ren funktion — ingen mutation. */
export function advance(
  tree: DecisionTree,
  state: SessionState,
  value: string,
  rawAnswer: string,
): AdvanceResult {
  if (!state.currentNodeId) return { state };
  const node = getNode(tree, state.currentNodeId);
  if (!node) return { state };

  const flag = node.redFlags?.find((f) => matches(f.when, value));
  const step: AnsweredStep = {
    nodeId: node.id,
    question: node.question[state.lang],
    rawAnswer,
    value,
    redFlagged: flag ? flag.message[state.lang] : undefined,
  };

  const target = flag?.goto ?? node.edges.find((e) => matches(e.when, value))?.goto ?? null;
  const isDisposition = target ? !!getDisposition(tree, target) : false;

  const next: SessionState = {
    ...state,
    path: [...state.path, step],
    currentNodeId: isDisposition ? null : target,
    dispositionId: isDisposition ? target : null,
    redFlags: flag ? [...state.redFlags, flag.message[state.lang]] : state.redFlags,
  };

  return {
    state: next,
    redFlag: flag ? { message: flag.message[state.lang], nodeId: node.id } : undefined,
  };
}

/** Ét skridt tilbage — "tilbage"-stemmekommandoen i OR-tilstand. */
export function goBack(state: SessionState): SessionState {
  if (state.path.length === 0) return state;
  const path = state.path.slice(0, -1);
  const last = state.path[state.path.length - 1];
  return {
    ...state,
    path,
    currentNodeId: last.nodeId,
    dispositionId: null,
    redFlags: state.redFlags.filter((m) => m !== last.redFlagged),
  };
}

/** Spørgsmålsteksten der skal stilles — kort form i OR-tilstand. */
export function questionText(node: TreeNode, lang: Lang, orMode: boolean): string {
  if (orMode && node.orQuestion) return node.orQuestion[lang];
  return node.question[lang];
}
