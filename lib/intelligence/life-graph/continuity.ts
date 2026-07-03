import type {
  ContinuitySignal,
  ContinuitySignalKind,
  DecisionRelevance,
  LifeGraphConfidence,
  LifeGraphNode,
  LifeGraphSnapshot,
} from "@/lib/intelligence/life-graph/types";

type LifeDomain =
  | "money"
  | "health"
  | "relationships"
  | "family"
  | "work"
  | "goals";

const DOMAIN_SUMMARIES: Record<LifeDomain, string> = {
  money: "Money has come up more than once.",
  health: "Health has come up more than once.",
  family: "Family has come up more than once.",
  relationships: "Relationships have come up more than once.",
  work: "Work has come up more than once.",
  goals: "Goals have come up more than once.",
};

const DELAYED_DECISION_PATTERNS = [
  /\bkeep\s+delaying\b/i,
  /\bdelaying\s+.+\s+again\b/i,
  /\bpostpon(ed|ing)\s+.+\s+again\b/i,
  /\bpostponed\s+again\b/i,
  /\bput\s+off\s+.+\s+again\b/i,
  /\bdelayed\s+.+\s+more\s+than\s+once\b/i,
];

const UNFINISHED_LOOP_PATTERNS = [
  /\bstill\s+need\s+to\b/i,
  /\bneed\s+to\s+(decide|cancel|finish)\b/i,
  /\bneed\s+to\s+decide\s+about\b/i,
  /\bhave\s+not\s+finished\b/i,
  /\bnot\s+finished\b/i,
  /\bhaven'?t\s+finished\b/i,
];

const IMPROVEMENT_PATTERNS = [
  /\bspent\s+less\b/i,
  /\bspending\s+improved\b/i,
  /\bworked\s+on\s+.+\s+again\b/i,
  /\bmy\s+spending\s+improved\b/i,
];

const REGRESSION_PATTERNS = [
  /\boverspent\s+again\b/i,
  /\bstopped\s+working\s+out\b/i,
  /\bfell\s+behind\b/i,
];

const GOAL_THEME_PATTERNS: Array<{ pattern: RegExp; theme: string }> = [
  { pattern: /\bmustang\b/i, theme: "mustang" },
  { pattern: /\bvending\s+business\b/i, theme: "vending business" },
];

function stableHash(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort();
}

function createContinuitySignal(input: {
  kind: ContinuitySignalKind;
  summary: string;
  confidence: LifeGraphConfidence;
  nodeIds: string[];
  memoryIds: string[];
  decisionRelevance: DecisionRelevance;
}): ContinuitySignal {
  const nodeIds = uniqueSorted(input.nodeIds);
  const memoryIds = uniqueSorted(input.memoryIds);
  const identity = [input.kind, ...nodeIds, ...memoryIds].join("|");

  return {
    id: `continuity_${input.kind}_${stableHash(identity)}`,
    kind: input.kind,
    summary: input.summary,
    confidence: input.confidence,
    nodeIds,
    memoryIds,
    decisionRelevance: input.decisionRelevance,
  };
}

function memoryNodes(snapshot: LifeGraphSnapshot): LifeGraphNode[] {
  return snapshot.nodes.filter((node) => node.kind === "memory");
}

function observationText(
  snapshot: LifeGraphSnapshot,
  observationId: string,
): string {
  return (
    snapshot.observations.find((observation) => observation.id === observationId)
      ?.rawContent ?? ""
  );
}

function memoryText(node: LifeGraphNode, snapshot: LifeGraphSnapshot): string {
  const parts = [node.label, node.summary];

  const attributes = node.metadata?.attributes as
    | {
        prompt?: string;
        originalPrompt?: string;
        destinations?: string[];
      }
    | undefined;

  if (attributes?.prompt) parts.push(attributes.prompt);
  if (attributes?.originalPrompt) parts.push(attributes.originalPrompt);

  for (const observationId of node.observationIds) {
    parts.push(observationText(snapshot, observationId));
  }

  return parts.filter(Boolean).join(" ");
}

function memoryDestinations(node: LifeGraphNode): string[] {
  const attributes = node.metadata?.attributes as
    | { destinations?: string[] }
    | undefined;

  return Array.isArray(attributes?.destinations) ? attributes.destinations : [];
}

function connectedNodeKinds(snapshot: LifeGraphSnapshot, nodeId: string) {
  return snapshot.edges
    .filter((edge) => edge.fromNodeId === nodeId)
    .map((edge) => snapshot.nodes.find((node) => node.id === edge.toNodeId)?.kind)
    .filter(Boolean);
}

function resolveMemoryDomain(
  node: LifeGraphNode,
  snapshot: LifeGraphSnapshot,
): LifeDomain | null {
  const connectedKinds = connectedNodeKinds(snapshot, node.id);

  if (connectedKinds.includes("financial_signal")) return "money";
  if (connectedKinds.includes("health_signal")) return "health";
  if (connectedKinds.includes("goal")) return "goals";

  if (connectedKinds.includes("relationship_signal")) {
    return memoryDestinations(node).includes("Family")
      ? "family"
      : "relationships";
  }

  const destinations = memoryDestinations(node);
  if (destinations.includes("Finance")) return "money";
  if (destinations.includes("Health")) return "health";
  if (destinations.includes("Family")) return "family";
  if (destinations.includes("Relationships")) return "relationships";
  if (destinations.includes("Work")) return "work";
  if (destinations.includes("Goals")) return "goals";

  return null;
}

function isGoalRelatedMemory(
  node: LifeGraphNode,
  snapshot: LifeGraphSnapshot,
): boolean {
  if (connectedNodeKinds(snapshot, node.id).includes("goal")) return true;
  return memoryDestinations(node).includes("Goals");
}

function matchesAnyPattern(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function confidenceFromEvidenceCount(count: number): LifeGraphConfidence {
  if (count >= 3) return "high";
  if (count >= 2) return "medium";
  return "low";
}

function extractGoalTheme(text: string): string | null {
  for (const entry of GOAL_THEME_PATTERNS) {
    if (entry.pattern.test(text)) {
      return entry.theme;
    }
  }

  const buyMatch = text.match(
    /\b(?:want to buy|buying|save for|thinking about getting)\s+(?:a|an|the)?\s*([a-z][a-z\s-]{2,})/i,
  );
  if (buyMatch?.[1]) {
    return buyMatch[1].trim().toLowerCase();
  }

  return null;
}

function summarizeGoalTheme(theme: string) {
  if (theme === "mustang") return "The Mustang goal has come up more than once.";
  if (theme === "vending business") {
    return "The vending business idea has come up more than once.";
  }

  const readable = theme.charAt(0).toUpperCase() + theme.slice(1);
  return `${readable} has come up more than once as a goal.`;
}

function summarizeDelayedDecision(text: string) {
  const uberMatch = text.match(/\b(?:cancell?ing|cancel)\s+(uber)\b/i);
  if (uberMatch) {
    return "Cancelling Uber keeps getting delayed.";
  }

  return "A decision keeps getting delayed.";
}

function summarizeUnfinishedLoop(text: string) {
  const uberMatch = text.match(/\b(?:cancel)\s+(uber)\b/i);
  if (uberMatch) {
    return "Cancelling Uber is still unfinished.";
  }

  const vendingMatch = text.match(/\bvending\s+business\b/i);
  if (vendingMatch) {
    return "The vending business decision is still unfinished.";
  }

  const amexMatch = text.match(/\bsubscriptions\s+on\s+my\s+amex\b/i);
  if (amexMatch) {
    return "Setting up subscriptions on Amex is still unfinished.";
  }

  return "Something still needs a decision or follow-through.";
}

function summarizeImprovement(text: string) {
  if (/\bspent\s+less\b/i.test(text)) {
    return "Spending was explicitly described as lower.";
  }
  if (/\bspending\s+improved\b/i.test(text)) {
    return "Spending was explicitly described as improved.";
  }
  if (/\bworked\s+on\s+.+\s+again\b/i.test(text)) {
    return "Work on a project was explicitly described as continuing again.";
  }

  return "An improvement was explicitly described.";
}

function summarizeRegression(text: string) {
  if (/\boverspent\s+again\b/i.test(text)) {
    return "Spending was explicitly described as overshooting again.";
  }
  if (/\bstopped\s+working\s+out\b/i.test(text)) {
    return "Exercise was explicitly described as stopping.";
  }
  if (/\bfell\s+behind\b/i.test(text)) {
    return "Progress was explicitly described as falling behind.";
  }

  return "A setback was explicitly described.";
}

function detectRecurringThemes(snapshot: LifeGraphSnapshot): ContinuitySignal[] {
  const grouped = new Map<LifeDomain, LifeGraphNode[]>();

  for (const node of memoryNodes(snapshot)) {
    const domain = resolveMemoryDomain(node, snapshot);
    if (!domain) continue;

    const group = grouped.get(domain) ?? [];
    group.push(node);
    grouped.set(domain, group);
  }

  const signals: ContinuitySignal[] = [];

  for (const [domain, nodes] of grouped) {
    if (nodes.length < 2) continue;

    signals.push(
      createContinuitySignal({
        kind: "recurring_theme",
        summary: DOMAIN_SUMMARIES[domain],
        confidence: confidenceFromEvidenceCount(nodes.length),
        nodeIds: nodes.map((node) => node.id),
        memoryIds: nodes.flatMap((node) => node.evidenceMemoryIds),
        decisionRelevance: "medium",
      }),
    );
  }

  return signals;
}

function detectResurfacedGoals(snapshot: LifeGraphSnapshot): ContinuitySignal[] {
  const grouped = new Map<string, LifeGraphNode[]>();

  for (const node of memoryNodes(snapshot)) {
    if (!isGoalRelatedMemory(node, snapshot)) continue;

    const theme = extractGoalTheme(memoryText(node, snapshot));
    if (!theme) continue;

    const group = grouped.get(theme) ?? [];
    group.push(node);
    grouped.set(theme, group);
  }

  const signals: ContinuitySignal[] = [];

  for (const [theme, nodes] of grouped) {
    if (nodes.length < 2) continue;

    signals.push(
      createContinuitySignal({
        kind: "resurfaced_goal",
        summary: summarizeGoalTheme(theme),
        confidence: confidenceFromEvidenceCount(nodes.length),
        nodeIds: nodes.map((node) => node.id),
        memoryIds: nodes.flatMap((node) => node.evidenceMemoryIds),
        decisionRelevance: "medium",
      }),
    );
  }

  return signals;
}

function detectDelayedDecisions(
  snapshot: LifeGraphSnapshot,
): ContinuitySignal[] {
  const signals: ContinuitySignal[] = [];

  for (const node of memoryNodes(snapshot)) {
    const text = memoryText(node, snapshot);
    if (!matchesAnyPattern(text, DELAYED_DECISION_PATTERNS)) continue;

    signals.push(
      createContinuitySignal({
        kind: "delayed_decision",
        summary: summarizeDelayedDecision(text),
        confidence: "medium",
        nodeIds: [node.id],
        memoryIds: node.evidenceMemoryIds,
        decisionRelevance: "high",
      }),
    );
  }

  return signals;
}

function detectUnfinishedLoops(snapshot: LifeGraphSnapshot): ContinuitySignal[] {
  const signals: ContinuitySignal[] = [];

  for (const node of memoryNodes(snapshot)) {
    const text = memoryText(node, snapshot);
    if (matchesAnyPattern(text, DELAYED_DECISION_PATTERNS)) continue;
    if (!matchesAnyPattern(text, UNFINISHED_LOOP_PATTERNS)) continue;

    signals.push(
      createContinuitySignal({
        kind: "unfinished_loop",
        summary: summarizeUnfinishedLoop(text),
        confidence: "medium",
        nodeIds: [node.id],
        memoryIds: node.evidenceMemoryIds,
        decisionRelevance: "high",
      }),
    );
  }

  return signals;
}

function detectImprovements(snapshot: LifeGraphSnapshot): ContinuitySignal[] {
  const signals: ContinuitySignal[] = [];

  for (const node of memoryNodes(snapshot)) {
    const text = memoryText(node, snapshot);
    if (!matchesAnyPattern(text, IMPROVEMENT_PATTERNS)) continue;

    signals.push(
      createContinuitySignal({
        kind: "improvement",
        summary: summarizeImprovement(text),
        confidence: "medium",
        nodeIds: [node.id],
        memoryIds: node.evidenceMemoryIds,
        decisionRelevance: "low",
      }),
    );
  }

  return signals;
}

function detectRegressions(snapshot: LifeGraphSnapshot): ContinuitySignal[] {
  const signals: ContinuitySignal[] = [];

  for (const node of memoryNodes(snapshot)) {
    const text = memoryText(node, snapshot);
    if (!matchesAnyPattern(text, REGRESSION_PATTERNS)) continue;

    signals.push(
      createContinuitySignal({
        kind: "regression",
        summary: summarizeRegression(text),
        confidence: "medium",
        nodeIds: [node.id],
        memoryIds: node.evidenceMemoryIds,
        decisionRelevance: "low",
      }),
    );
  }

  return signals;
}

export function deriveContinuitySignals(
  snapshot: LifeGraphSnapshot,
): ContinuitySignal[] {
  const signals = [
    ...detectRecurringThemes(snapshot),
    ...detectResurfacedGoals(snapshot),
    ...detectDelayedDecisions(snapshot),
    ...detectUnfinishedLoops(snapshot),
    ...detectImprovements(snapshot),
    ...detectRegressions(snapshot),
  ];

  return signals.sort((left, right) => left.id.localeCompare(right.id));
}
