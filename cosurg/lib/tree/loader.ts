import type { DecisionTree } from "./types";
import burns from "@/content/trees/burns.json";
import dressingHandArm from "@/content/trees/dressing-hand-arm.json";
import frostbite from "@/content/trees/frostbite.json";
import bites from "@/content/trees/bites.json";

/**
 * Træ-kilde. I dag: JSON i repoet. På sigt: teamets egen MCP-server koblet på Cortis
 * agentic framework, så kliniske træer kan vedligeholdes centralt og deles på tværs
 * af apps. Motoren kender kun dette interface — MCP-kilden kan plugges ind uden at
 * røre engine.ts eller UI'et.
 */
export interface TreeSource {
  list(): Promise<TreeSummary[]>;
  get(id: string): Promise<DecisionTree | undefined>;
}

export interface TreeSummary {
  id: string;
  name: DecisionTree["name"];
  version: string;
  authors?: string[];
}

class LocalTreeSource implements TreeSource {
  private trees: DecisionTree[] = [
    burns as unknown as DecisionTree,
    dressingHandArm as unknown as DecisionTree,
    frostbite as unknown as DecisionTree,
    bites as unknown as DecisionTree,
  ];

  async list(): Promise<TreeSummary[]> {
    return this.trees.map(({ id, name, version, authors }) => ({ id, name, version, authors }));
  }

  async get(id: string): Promise<DecisionTree | undefined> {
    return this.trees.find((t) => t.id === id);
  }
}

export const treeSource: TreeSource = new LocalTreeSource();
