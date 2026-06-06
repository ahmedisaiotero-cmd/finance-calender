import { weeklyWorkoutSplit } from "@/components/health/health-mock-data";

export type PulseKind =
  | "steady"
  | "refocus"
  | "building-momentum"
  | "recover";

export type SyncPulse = {
  kind: PulseKind;
  label: string;
  message: string;
};

const PULSE_COPY: Record<PulseKind, { label: string; message: string }> = {
  steady: {
    label: "Steady",
    message: "You're keeping up with the habits that matter most.",
  },
  refocus: {
    label: "Refocus",
    message:
      "Life has been busy. Start with today's priorities and let the rest wait.",
  },
  "building-momentum": {
    label: "Building Momentum",
    message: "Small wins are adding up.",
  },
  recover: {
    label: "Recover",
    message: "Give yourself permission to simplify this week.",
  },
};

export type PulseInput = {
  workoutsDone: number;
  workoutsGoal: number;
  recoveryPercent: number;
  withinBudget: boolean;
  budgetUsedPercent: number;
};

export function resolvePulse(input: PulseInput): SyncPulse {
  const {
    workoutsDone,
    workoutsGoal,
    recoveryPercent,
    withinBudget,
    budgetUsedPercent,
  } = input;

  let kind: PulseKind = "steady";

  if (recoveryPercent < 65) {
    kind = "recover";
  } else if (!withinBudget || budgetUsedPercent > 90) {
    kind = "refocus";
  } else if (workoutsDone >= workoutsGoal) {
    kind = "building-momentum";
  } else if (workoutsDone < Math.max(2, workoutsGoal - 2)) {
    kind = "refocus";
  }

  return { kind, ...PULSE_COPY[kind] };
}

export function buildHealthRhythmMessage(
  workoutsDone: number,
  reference = new Date(),
  nextOpportunity?: string | null,
): string {
  const next =
    nextOpportunity ??
    (() => {
      const planned = weeklyWorkoutSplit.find(
        (day) => day.status === "today" || day.status === "planned",
      );
      if (!planned) return null;
      return planned.status === "today" ? "today" : planned.day;
    })();

  const activePhrase =
    workoutsDone === 0
      ? "A fresh week is a good time to start small"
      : workoutsDone === 1
        ? "You've stayed active once this week"
        : `You've stayed active ${workoutsDone} times this week`;

  if (!next) return `${activePhrase}.`;

  return `${activePhrase}. Your next opportunity to move is ${next}.`;
}

export function buildBudgetCategoryNote(
  category: string,
  spent: number,
  limit: number,
  overallRemaining: number,
): string | undefined {
  if (spent <= limit) return undefined;

  const remaining = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.max(overallRemaining, 0));

  return `${category} spending is a little higher than planned. You still have ${remaining} remaining overall.`;
}

export function buildMoneySnapshotNote(
  spent: number,
  budget: number,
  remaining: number,
): string {
  const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;

  if (pct >= 95) {
    return "Your finances need attention this week. Here's where to start.";
  }
  if (pct >= 80) {
    return "Spending is picking up — you still have room to adjust.";
  }
  return `${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(remaining)} still available this month.`;
}
