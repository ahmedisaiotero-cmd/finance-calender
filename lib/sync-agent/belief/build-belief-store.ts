import type {
  Belief,
  BeliefHorizon,
  BeliefKind,
  BeliefStore,
  BuildBeliefStoreInput,
  ConfidenceBand,
  PrivacySensitivity,
  SyncMemory,
  SyncPattern,
  SyncProfile,
} from "./types";

const SENSITIVE_PATTERNS = [
  /\bpassword\b/i,
  /\bapi[_\s-]?key\b/i,
  /\bsecret\b/i,
  /\bssh[_\s-]?key\b/i,
  /\btoken\b/i,
  /\bcredential/i,
];

const TRIVIAL_PATTERNS = [
  /\b(brushed|brush)\s+(my\s+)?teeth\b/i,
  /\b(had|drank|drinking)\s+(a\s+)?coffee\b/i,
  /\b(coffee|tea)\s+break\b/i,
  /\bwoke\s+up\b/i,
];

const OBLIGATION_PATTERNS = [
  /\brent\b/i,
  /\bbill\b/i,
  /\bdue\b/i,
  /\bpay\b/i,
  /\bmortgage\b/i,
  /\binsurance\b/i,
];

const COMMITMENT_PATTERNS = [
  /\bwork\s+(shift|schedule)\b/i,
  /\bshift\b/i,
  /\bmeeting\b/i,
  /\bappointment\b/i,
  /\bstandup\b/i,
];

const PREFERENCE_PATTERNS = [
  /\bprefers?\b/i,
  /\blikes?\b/i,
  /\bfavorite\b/i,
  /\bdislikes?\b/i,
];

const FACT_PATTERNS = [
  /\bbirthday\b/i,
  /\bborn\b/i,
  /\banniversary\b/i,
];

function stableHash(input: string): string {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function normalizeProposition(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s'-]/g, "")
    .trim();
}

function mergeKey(kind: BeliefKind, domain: string, proposition: string): string {
  return `${kind}::${domain}::${normalizeProposition(proposition)}`;
}

function beliefId(kind: BeliefKind, domain: string, proposition: string): string {
  return `belief:${kind}:${domain}:${stableHash(mergeKey(kind, domain, proposition))}`;
}

function scoreToBand(score: number): ConfidenceBand {
  if (score >= 0.9) return "certain";
  if (score >= 0.75) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

function inferHorizon(kind: BeliefKind, proposition: string): BeliefHorizon {
  if (kind === "profile" || kind === "pattern") return "ongoing";
  if (/\b(today|tonight|now|asap)\b/i.test(proposition)) return "immediate";
  if (/\b(this week|friday|monday|tomorrow)\b/i.test(proposition)) {
    return "short";
  }
  if (kind === "obligation" || kind === "commitment") return "short";
  if (kind === "fact") return "long";
  return "medium";
}

function inferPrivacy(domain: string, kind: BeliefKind): PrivacySensitivity {
  if (kind === "sensitive") return "restricted";
  if (domain === "relationships" || domain === "health") return "medium";
  if (domain === "money" || domain === "security") return "high";
  return "low";
}

function containsSensitiveText(text: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(text));
}

function isTrivialMemory(memory: SyncMemory): boolean {
  if (memory.trivial) return true;
  if (memory.status === "ignored") return true;
  return TRIVIAL_PATTERNS.some((pattern) => pattern.test(memory.text));
}

function isBlockedMemory(memory: SyncMemory): boolean {
  if (memory.securityRejected) return true;
  if (memory.sensitive) return true;
  if (memory.status === "rejected") return true;
  if (containsSensitiveText(memory.text)) return true;
  return false;
}

function isCommittedMemory(memory: SyncMemory): boolean {
  if (memory.status === "draft" || memory.status === "ignored") return false;
  if (memory.committed === true) return true;
  if (memory.status === "committed") return true;
  if (memory.correction) return true;
  return false;
}

function inferKindFromMemory(memory: SyncMemory): BeliefKind | null {
  if (memory.kind && memory.kind !== "event" && memory.kind !== "note") {
    return memory.kind;
  }

  const text = memory.text;
  if (memory.correction) return "correction";
  if (OBLIGATION_PATTERNS.some((pattern) => pattern.test(text))) {
    return "obligation";
  }
  if (COMMITMENT_PATTERNS.some((pattern) => pattern.test(text))) {
    return "commitment";
  }
  if (PREFERENCE_PATTERNS.some((pattern) => pattern.test(text))) {
    return "preference";
  }
  if (FACT_PATTERNS.some((pattern) => pattern.test(text))) {
    return /\b(birthday|anniversary)\b/i.test(text) ? "obligation" : "fact";
  }

  return "fact";
}

function propositionFromMemory(memory: SyncMemory): string {
  if (memory.correction?.text) return memory.correction.text.trim();
  if (memory.correction?.correctsProposition) {
    return memory.correction.correctsProposition.trim();
  }
  return memory.text.trim();
}

function confidenceFromEvidenceCount(count: number, base = 0.55): number {
  const bonus = Math.min(0.35, Math.max(0, count - 1) * 0.12);
  return Math.min(1, base + bonus);
}

function sortMemories(memories: SyncMemory[]): SyncMemory[] {
  return [...memories].sort((left, right) => {
    const byId = left.id.localeCompare(right.id);
    if (byId !== 0) return byId;
    return left.updatedAt.localeCompare(right.updatedAt);
  });
}

function sortPatterns(patterns: SyncPattern[]): SyncPattern[] {
  return [...patterns].sort((left, right) => left.id.localeCompare(right.id));
}

function sortBeliefs(beliefs: Belief[]): Belief[] {
  return [...beliefs].sort((left, right) => left.id.localeCompare(right.id));
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function buildMemoryBeliefs(memories: SyncMemory[]): Belief[] {
  const beliefs: Belief[] = [];

  for (const memory of sortMemories(memories)) {
    if (!isCommittedMemory(memory)) continue;
    if (isBlockedMemory(memory)) continue;
    if (isTrivialMemory(memory)) continue;

    const kind = inferKindFromMemory(memory);
    if (!kind) continue;

    const proposition = propositionFromMemory(memory);
    const normalized = normalizeProposition(proposition);
    if (!normalized) continue;

    const createdAt = memory.createdAt;
    const updatedAt = memory.updatedAt;

    beliefs.push({
      id: beliefId(kind, memory.domain, proposition),
      kind,
      domain: memory.domain,
      proposition,
      confidence: scoreToBand(confidenceFromEvidenceCount(1)),
      confidenceScore: confidenceFromEvidenceCount(1),
      horizon: inferHorizon(kind, proposition),
      status: "active",
      evidenceIds: [memory.id],
      supersedesBeliefIds: [],
      createdAt,
      updatedAt,
      privacySensitivity: inferPrivacy(memory.domain, kind),
      explanation: `Derived from committed memory ${memory.id}.`,
    });
  }

  return beliefs;
}

function buildProfileBeliefs(profile: SyncProfile, referenceNow: string): Belief[] {
  const beliefs: Belief[] = [];
  const priorities = profile.priorities ?? [];

  for (const priority of [...priorities].sort((left, right) => left.localeCompare(right))) {
    const proposition = `User priority: ${priority}`;
    beliefs.push({
      id: beliefId("profile", "profile", proposition),
      kind: "profile",
      domain: "profile",
      proposition,
      confidence: "high",
      confidenceScore: 0.85,
      horizon: "ongoing",
      status: "active",
      evidenceIds: [],
      supersedesBeliefIds: [],
      createdAt: referenceNow,
      updatedAt: referenceNow,
      privacySensitivity: "low",
      explanation: `Derived from onboarding profile priority "${priority}".`,
    });
  }

  return beliefs;
}

function buildPatternBeliefs(
  patterns: SyncPattern[],
  referenceNow: string,
): Belief[] {
  const beliefs: Belief[] = [];

  for (const pattern of sortPatterns(patterns)) {
    if (pattern.active === false) continue;

    const kind = pattern.kind ?? "pattern";
    const proposition = pattern.proposition.trim();
    if (!proposition) continue;

    const confidenceScore = pattern.confidenceScore ?? 0.7;
    beliefs.push({
      id: beliefId(kind, pattern.domain, proposition),
      kind,
      domain: pattern.domain,
      proposition,
      confidence: scoreToBand(confidenceScore),
      confidenceScore,
      horizon: "ongoing",
      status: "active",
      evidenceIds: uniqueSorted(pattern.evidenceIds ?? [pattern.id]),
      supersedesBeliefIds: [],
      createdAt: pattern.createdAt ?? referenceNow,
      updatedAt: pattern.updatedAt ?? referenceNow,
      privacySensitivity: inferPrivacy(pattern.domain, kind),
      explanation: `Derived from active pattern ${pattern.id}.`,
    });
  }

  return beliefs;
}

function mergeDuplicateBeliefs(beliefs: Belief[]): Belief[] {
  const merged = new Map<string, Belief>();

  for (const belief of beliefs) {
    const key = mergeKey(belief.kind, belief.domain, belief.proposition);
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, {
        ...belief,
        evidenceIds: uniqueSorted(belief.evidenceIds),
        supersedesBeliefIds: uniqueSorted(belief.supersedesBeliefIds),
      });
      continue;
    }

    const evidenceIds = uniqueSorted([
      ...existing.evidenceIds,
      ...belief.evidenceIds,
    ]);
    const supersedesBeliefIds = uniqueSorted([
      ...existing.supersedesBeliefIds,
      ...belief.supersedesBeliefIds,
    ]);
    const confidenceScore = confidenceFromEvidenceCount(evidenceIds.length);
    const createdAt =
      existing.createdAt < belief.createdAt ? existing.createdAt : belief.createdAt;
    const updatedAt =
      existing.updatedAt > belief.updatedAt ? existing.updatedAt : belief.updatedAt;

    merged.set(key, {
      ...existing,
      evidenceIds,
      supersedesBeliefIds,
      confidence: scoreToBand(confidenceScore),
      confidenceScore,
      createdAt,
      updatedAt,
      explanation:
        evidenceIds.length > 1
          ? `Merged from ${evidenceIds.length} evidence sources.`
          : existing.explanation,
    });
  }

  return sortBeliefs([...merged.values()]);
}

function applyCorrections(
  beliefs: Belief[],
  memories: SyncMemory[],
): Belief[] {
  const memoryById = new Map(memories.map((memory) => [memory.id, memory]));
  const beliefByEvidence = new Map<string, Belief[]>();

  for (const belief of beliefs) {
    for (const evidenceId of belief.evidenceIds) {
      const linked = beliefByEvidence.get(evidenceId) ?? [];
      linked.push(belief);
      beliefByEvidence.set(evidenceId, linked);
    }
  }

  const correctedBeliefs = beliefs.map((belief) => ({ ...belief }));
  const beliefIndex = new Map(
    correctedBeliefs.map((belief, index) => [belief.id, index]),
  );

  const correctionMemories = sortMemories(memories).filter(
    (memory) => memory.correction?.supersedesMemoryIds?.length,
  );

  for (const correctionMemory of correctionMemories) {
    const supersededMemoryIds =
      correctionMemory.correction?.supersedesMemoryIds ?? [];
    const supersededBeliefIds = new Set<string>();

    for (const memoryId of supersededMemoryIds) {
      const linkedBeliefs = beliefByEvidence.get(memoryId) ?? [];
      for (const linkedBelief of linkedBeliefs) {
        supersededBeliefIds.add(linkedBelief.id);
      }
    }

    if (supersededBeliefIds.size === 0) continue;

    const proposition = propositionFromMemory(correctionMemory);
    const kind = inferKindFromMemory(correctionMemory) ?? "correction";
    const correctedId = beliefId(kind, correctionMemory.domain, proposition);
    const referenceMemory = memoryById.get(supersededMemoryIds[0]!);

    for (const supersededId of supersededBeliefIds) {
      const index = beliefIndex.get(supersededId);
      if (index === undefined) continue;
      correctedBeliefs[index] = {
        ...correctedBeliefs[index]!,
        status: "superseded",
        updatedAt: correctionMemory.updatedAt,
      };
    }

    const evidenceIds = uniqueSorted([
      correctionMemory.id,
      ...supersededMemoryIds,
    ]);

    const correctedBelief: Belief = {
      id: correctedId,
      kind,
      domain: correctionMemory.domain,
      proposition,
      confidence: "high",
      confidenceScore: 0.8,
      horizon: inferHorizon(kind, proposition),
      status: "active",
      evidenceIds,
      supersedesBeliefIds: uniqueSorted([...supersededBeliefIds]),
      createdAt: correctionMemory.createdAt,
      updatedAt: correctionMemory.updatedAt,
      privacySensitivity: inferPrivacy(
        correctionMemory.domain,
        kind,
      ),
      explanation: referenceMemory
        ? `Corrects prior belief supported by memory ${referenceMemory.id}.`
        : `Corrects prior belief from correction memory ${correctionMemory.id}.`,
    };

    const existingIndex = beliefIndex.get(correctedId);
    if (existingIndex !== undefined) {
      const existing = correctedBeliefs[existingIndex]!;
      correctedBeliefs[existingIndex] = {
        ...existing,
        ...correctedBelief,
        evidenceIds: uniqueSorted([
          ...existing.evidenceIds,
          ...correctedBelief.evidenceIds,
        ]),
        supersedesBeliefIds: uniqueSorted([
          ...existing.supersedesBeliefIds,
          ...correctedBelief.supersedesBeliefIds,
        ]),
      };
    } else {
      correctedBeliefs.push(correctedBelief);
      beliefIndex.set(correctedId, correctedBeliefs.length - 1);
    }
  }

  return sortBeliefs(correctedBeliefs);
}

export function buildBeliefStore(input: BuildBeliefStoreInput): BeliefStore {
  const referenceNow = input.reference.now ?? "1970-01-01T00:00:00.000Z";

  const memoryBeliefs = buildMemoryBeliefs(input.memories);
  const profileBeliefs = buildProfileBeliefs(input.profile, referenceNow);
  const patternBeliefs = buildPatternBeliefs(input.patterns, referenceNow);

  const merged = mergeDuplicateBeliefs([
    ...memoryBeliefs,
    ...profileBeliefs,
    ...patternBeliefs,
  ]);

  const corrected = applyCorrections(merged, input.memories);

  return {
    beliefs: corrected,
    builtAt: referenceNow,
  };
}
