export const BELIEF_KINDS = [
  "fact",
  "preference",
  "commitment",
  "obligation",
  "concern",
  "pattern",
  "profile",
  "correction",
  "sensitive",
] as const;

export type BeliefKind = (typeof BELIEF_KINDS)[number];

export const CONFIDENCE_BANDS = ["low", "medium", "high", "certain"] as const;
export type ConfidenceBand = (typeof CONFIDENCE_BANDS)[number];

export const BELIEF_HORIZONS = [
  "immediate",
  "short",
  "medium",
  "long",
  "ongoing",
] as const;
export type BeliefHorizon = (typeof BELIEF_HORIZONS)[number];

export const BELIEF_STATUSES = [
  "active",
  "superseded",
  "expired",
  "uncertain",
] as const;
export type BeliefStatus = (typeof BELIEF_STATUSES)[number];

export const PRIVACY_SENSITIVITIES = [
  "none",
  "low",
  "medium",
  "high",
  "restricted",
] as const;
export type PrivacySensitivity = (typeof PRIVACY_SENSITIVITIES)[number];

export interface Belief {
  id: string;
  kind: BeliefKind;
  domain: string;
  proposition: string;
  confidence: ConfidenceBand;
  confidenceScore: number;
  horizon: BeliefHorizon;
  status: BeliefStatus;
  evidenceIds: string[];
  supersedesBeliefIds: string[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  privacySensitivity: PrivacySensitivity;
  explanation: string;
}

export interface BeliefStore {
  beliefs: Belief[];
  builtAt: string;
}

export interface MemoryCorrection {
  supersedesMemoryIds?: string[];
  text?: string;
  correctsProposition?: string;
}

export interface SyncMemory {
  id: string;
  domain: string;
  text: string;
  kind?: BeliefKind | "event" | "note";
  committed?: boolean;
  status?: "committed" | "draft" | "ignored" | "rejected";
  trivial?: boolean;
  sensitive?: boolean;
  securityRejected?: boolean;
  correction?: MemoryCorrection;
  createdAt: string;
  updatedAt: string;
}

export interface SyncProfile {
  priorities?: string[];
  goals?: string[];
  name?: string;
  timezone?: string;
  [key: string]: string | string[] | undefined;
}

export interface SyncPattern {
  id: string;
  domain: string;
  proposition: string;
  kind?: BeliefKind;
  active?: boolean;
  evidenceIds?: string[];
  confidenceScore?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BeliefBuildReference {
  now?: string;
}

export interface BuildBeliefStoreInput {
  memories: SyncMemory[];
  profile: SyncProfile;
  patterns: SyncPattern[];
  reference: BeliefBuildReference;
}
