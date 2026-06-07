import { weeklyWorkoutSplit } from "@/components/health/health-mock-data";
import {
  isLifeAreaActive,
  isPulseDomainActive,
  type ActiveLifeAreas,
  type PulseLifeDomain,
} from "@/lib/user-life-areas";

export type PulseState =
  | "steady"
  | "refocus"
  | "build-momentum"
  | "recover"
  | "protected"
  | "opportunity"
  | "connect";

/** @deprecated Use PulseState */
export type PulseKind = PulseState;

export type PulseSignalDomain = PulseLifeDomain;

export type PulseSignal = {
  domain: PulseSignalDomain;
  key: string;
  weight?: number;
};

export type SyncPulse = {
  state: PulseState;
  title: string;
  message: string;                                                                                                                                                                                                                                                                                                                                                                                                               
  contributingSignals: PulseSignal[];
  nextStep?: string;
};

/** @deprecated Use SyncPulse.state */
export type LegacySyncPulse = SyncPulse & { kind?: PulseState; label?: string };

const PULSE_TITLES: Record<PulseState, string> = {
  steady: "Steady",
  refocus: "Refocus",
  "build-momentum": "Build Momentum",
  recover: "Recover",
  protected: "Protected",
  opportunity: "Opportunity",
  connect: "Connect",
};

export type PulseInput = {
  activeLifeAreas: ActiveLifeAreas;
  scheduleFull: boolean;
  scheduleLight: boolean;
  topPrioritiesCount: number;
  calendarConnected: boolean;
  sleepLight: boolean;
  recoveryLow: boolean;
  recoveryStrong: boolean;
  workoutsDone: number;
  workoutsGoal: number;
  healthConnected: boolean;
  withinBudget: boolean;
  budgetTight: boolean;
  billsUpcoming: boolean;
  cashFlowHealthy: boolean;
  moneyConnected: boolean;
  goalsOnTrack: boolean;
  goalsNeedAttention: boolean;
  /** Work area active + heavy work day on calendar. */
  workCalendarHeavy?: boolean;
  /** School area active + upcoming school events on timeline. */
  schoolEventsUpcoming?: boolean;
};

function filterPulseSignals(
  signals: PulseSignal[],
  areas: ActiveLifeAreas,
): PulseSignal[] {
  return signals.filter((signal) =>
    isPulseDomainActive(areas, signal.domain),
  );
}

function priorityPhrase(count: number): string {
  if (count >= 2) return "your top two priorities";
  if (count === 1) return "your top priority";
  return "what matters most today";
}

function buildPulse(
  state: PulseState,
  message: string,
  signals: PulseSignal[],
): SyncPulse {
  return {
    state,
    title: PULSE_TITLES[state],
    message,
    contributingSignals: signals,
  };
}

function buildHomePulseMessage(state: PulseState, input: PulseInput): string {
  const priorities = priorityPhrase(input.topPrioritiesCount);
  const areas = input.activeLifeAreas;
  const goalsActive = isLifeAreaActive(areas, "goals");

  if (state === "refocus") {
    if (input.workCalendarHeavy) {
      return `Work and personal commitments are stacked today. Handle ${priorities} first.`;
    }
    if (input.schoolEventsUpcoming) {
      return `School deadlines are approaching. Handle ${priorities} first, then make room for coursework.`;
    }
    if (input.scheduleFull && input.sleepLight) {
      return `Your schedule is full and sleep was light. Handle ${priorities} first, then protect your evening.`;
    }
    if (input.scheduleFull) {
      return `Your calendar is stacked today. Handle ${priorities} first.`;
    }
    if (input.sleepLight) {
      return `Sleep was lighter than usual. Keep today simple and start with ${priorities}.`;
    }
    if (input.budgetTight || !input.withinBudget) {
      return `Spending needs a lighter touch this month. Stay with ${priorities} and review money when you have a moment.`;
    }
    if (goalsActive && input.goalsNeedAttention) {
      return `A few goals need attention. Focus on ${priorities} before taking on anything new.`;
    }
    return `Today calls for a narrower focus. Start with ${priorities} and let the rest wait.`;
  }

  if (state === "recover") {
    if (input.sleepLight) {
      return `Recovery could use some care. Simplify today and leave room to rest this evening.`;
    }
    return `A lighter week will serve you well. Keep only what truly matters on your plate.`;
  }

  if (state === "build-momentum") {
    return `Your habits are lining up. Focus on what moves the needle today.`;
  }

  if (state === "protected") {
    return `Essentials are covered and your rhythm looks stable. Stay with what's working.`;
  }

  if (state === "opportunity") {
    const missing: string[] = [];
    if (isLifeAreaActive(areas, "calendar") && !input.calendarConnected) {
      missing.push("calendar");
    }
    if (isLifeAreaActive(areas, "finance") && !input.moneyConnected) {
      missing.push("finance");
    }
    if (isLifeAreaActive(areas, "health") && !input.healthConnected) {
      missing.push("health");
    }
    if (missing.length > 0) {
      return `You have room today. Connect ${missing.join(" and ")} when you're ready — Sync will bring it into your briefing.`;
    }
    if (goalsActive && input.goalsOnTrack) {
      return `Today has some open space. A good moment to advance something that matters to you.`;
    }
    return `The day looks open. Use the space intentionally — one meaningful move is enough.`;
  }

  if (state === "connect") {
    return `Connect your accounts when you're ready. Sync will fold them into your daily briefing.`;
  }

  return `You're in a workable rhythm. Keep today's pace calm and intentional.`;
}

export function resolvePulse(input: PulseInput): SyncPulse {
  const areas = input.activeLifeAreas;
  const signals: PulseSignal[] = [];

  if (isLifeAreaActive(areas, "calendar") && input.scheduleFull) {
    signals.push({ domain: "calendar", key: "schedule-dense", weight: 2 });
  }
  if (isLifeAreaActive(areas, "calendar") && input.scheduleLight) {
    signals.push({ domain: "calendar", key: "schedule-light", weight: 1 });
  }
  if (isLifeAreaActive(areas, "finance") && input.billsUpcoming) {
    signals.push({ domain: "finance", key: "bills-upcoming", weight: 1 });
  }
  if (
    isLifeAreaActive(areas, "finance") &&
    (input.budgetTight || !input.withinBudget)
  ) {
    signals.push({ domain: "finance", key: "financial-pressure", weight: 2 });
  }
  if (isLifeAreaActive(areas, "finance") && input.cashFlowHealthy) {
    signals.push({ domain: "finance", key: "cash-flow-stable", weight: 1 });
  }
  if (isLifeAreaActive(areas, "health") && input.sleepLight) {
    signals.push({ domain: "health", key: "sleep-light", weight: 2 });
  }
  if (isLifeAreaActive(areas, "health") && input.recoveryLow) {
    signals.push({ domain: "health", key: "recovery-low", weight: 2 });
  }
  if (isLifeAreaActive(areas, "health") && input.recoveryStrong) {
    signals.push({ domain: "health", key: "recovery-strong", weight: 1 });
  }
  if (
    isLifeAreaActive(areas, "health") &&
    input.workoutsDone >= input.workoutsGoal
  ) {
    signals.push({ domain: "health", key: "movement-consistent", weight: 1 });
  }
  if (isLifeAreaActive(areas, "work") && input.workCalendarHeavy) {
    signals.push({ domain: "work", key: "work-day-dense", weight: 2 });
  }
  if (isLifeAreaActive(areas, "school") && input.schoolEventsUpcoming) {
    signals.push({ domain: "school", key: "school-upcoming", weight: 2 });
  }
  if (isLifeAreaActive(areas, "goals") && input.goalsOnTrack) {
    signals.push({ domain: "goals", key: "momentum-strong", weight: 1 });
  }
  if (isLifeAreaActive(areas, "goals") && input.goalsNeedAttention) {
    signals.push({ domain: "goals", key: "needs-attention", weight: 2 });
  }

  const calendarOk =
    !isLifeAreaActive(areas, "calendar") || input.calendarConnected;
  const financeOk =
    !isLifeAreaActive(areas, "finance") || input.moneyConnected;
  const healthOk =
    !isLifeAreaActive(areas, "health") || input.healthConnected;
  const allConnected = calendarOk && financeOk && healthOk;

  let state: PulseState = "steady";

  if (input.recoveryLow) {
    state = "recover";
  } else if (
    input.scheduleFull ||
    input.workCalendarHeavy ||
    input.schoolEventsUpcoming ||
    input.budgetTight ||
    !input.withinBudget ||
    input.goalsNeedAttention ||
    input.sleepLight
  ) {
    state = "refocus";
  } else if (
    isLifeAreaActive(areas, "health") &&
    input.workoutsDone >= input.workoutsGoal &&
    input.withinBudget &&
    !input.scheduleFull
  ) {
    state = "build-momentum";
  } else if (
    allConnected &&
    input.cashFlowHealthy &&
    input.withinBudget &&
    !input.billsUpcoming
  ) {
    state = "protected";
  } else if (
    input.scheduleLight &&
    input.withinBudget &&
    (input.recoveryStrong || !input.healthConnected)
  ) {
    state = "opportunity";
  } else if (!allConnected) {
    state = "opportunity";
  }

  return buildPulse(
    state,
    buildHomePulseMessage(state, input),
    filterPulseSignals(signals, areas),
  );
}

export function buildHealthRhythmMessage(
  workoutsDone: number,
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
        ? "You've moved once this week"
        : "You've been moving consistently this week";

  if (!next) return `${activePhrase}.`;

  return `${activePhrase}. Your next chance to move is ${next}.`;
}

export type HealthPulseInput = {
  sleepLight: boolean;
  recoveryLow: boolean;
  recoveryStrong: boolean;
  movementConsistent: boolean;
  todayIsLight: boolean;
  healthConnected: boolean;
};

export function buildHealthPulse(input: HealthPulseInput): SyncPulse {
  const signals: PulseSignal[] = [];

  if (!input.healthConnected) {
    return buildPulse(
      "connect",
      "Keep your health app. Connect it here and Sync will read sleep, movement, and recovery — only the signals that matter.",
      [{ domain: "health", key: "disconnected" }],
    );
  }

  if (input.sleepLight) {
    signals.push({ domain: "health", key: "sleep-light", weight: 2 });
  }
  if (input.recoveryLow) {
    signals.push({ domain: "health", key: "recovery-low", weight: 2 });
  }
  if (input.recoveryStrong) {
    signals.push({ domain: "health", key: "recovery-strong", weight: 1 });
  }
  if (input.movementConsistent) {
    signals.push({ domain: "health", key: "movement-consistent", weight: 1 });
  }
  if (input.todayIsLight) {
    signals.push({ domain: "health", key: "light-day", weight: 1 });
  }

  if (input.recoveryLow) {
    return buildPulse(
      "recover",
      "Recovery is asking for a gentler day. Lighter movement and an earlier wind-down will help.",
      signals,
    );
  }

  if (input.sleepLight) {
    return buildPulse(
      "refocus",
      "Sleep was lighter last night. Keep today gentle and protect rest this evening.",
      signals,
    );
  }

  if (input.movementConsistent && input.recoveryStrong) {
    return buildPulse(
      "build-momentum",
      "You're moving consistently this week. Today's basics matter more than pushing harder.",
      signals,
    );
  }

  if (input.todayIsLight && input.recoveryStrong) {
    return buildPulse(
      "steady",
      "Recovery looks steady. Today is a good day to stay light and protect sleep.",
      signals,
    );
  }

  if (input.recoveryStrong && input.movementConsistent) {
    return buildPulse(
      "opportunity",
      "Your health rhythm has some room. A walk or mobility session would fit well today.",
      signals,
    );
  }

  return buildPulse(
    "steady",
    "Sleep, movement, and recovery look balanced. Stay with the basics that support you.",
    signals,
  );
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

export type FinancePulseInput = {
  financeConnected: boolean;
  diningElevated: boolean;
  billsCovered: boolean;
  savingsOnPace: boolean;
  cashFlowHealthy: boolean;
  billsUpcoming: boolean;
};

export function buildFinancePulse(input: FinancePulseInput): SyncPulse {
  const signals: PulseSignal[] = [];

  if (!input.financeConnected) {
    return buildPulse(
      "connect",
      "Keep your accounts where they are. Connect them here and Sync will translate what needs attention — calmly.",
      [{ domain: "finance", key: "disconnected" }],
    );
  }

  if (input.cashFlowHealthy) {
    signals.push({ domain: "finance", key: "cash-flow-stable", weight: 1 });
  }
  if (input.billsUpcoming) {
    signals.push({ domain: "finance", key: "bills-upcoming", weight: 2 });
  }
  if (input.diningElevated) {
    signals.push({ domain: "finance", key: "discretionary-elevated", weight: 1 });
  }
  if (input.savingsOnPace) {
    signals.push({ domain: "finance", key: "savings-on-pace", weight: 1 });
  }

  if (
    input.billsCovered &&
    input.savingsOnPace &&
    input.cashFlowHealthy &&
    !input.diningElevated
  ) {
    return buildPulse(
      "protected",
      "Bills are covered and savings are on pace. Nothing urgent needs your attention today.",
      signals,
    );
  }

  if (input.diningElevated) {
    return buildPulse(
      "refocus",
      "Discretionary spending is running a little high. Essentials are still covered — a small adjustment this week keeps you on track.",
      signals,
    );
  }

  if (!input.billsCovered || input.billsUpcoming) {
    return buildPulse(
      "refocus",
      "Upcoming obligations deserve a look. Review what's due next and protect your balance for essentials.",
      signals,
    );
  }

  if (input.cashFlowHealthy && input.billsCovered) {
    return buildPulse(
      "steady",
      "Cash flow looks manageable and obligations are in hand. Keep the rhythm steady.",
      signals,
    );
  }

  return buildPulse(
    "steady",
    "You're in a workable financial rhythm. Sync will flag anything that needs a closer look.",
    signals,
  );
}

export type CalendarPulseInput = {
  selectedDayEventCount: number;
  nextDayEventCount: number;
  nextThreeDaysBusy: boolean;
  hasMoneyEventSoon: boolean;
  hasHealthEventOnSelectedDay: boolean;
  isToday: boolean;
};

export function buildCalendarPulse(input: CalendarPulseInput): SyncPulse {
  const signals: PulseSignal[] = [];
  const selectedBusy = input.selectedDayEventCount >= 4;
  const selectedLight = input.selectedDayEventCount <= 1;
  const tomorrowBusy = input.nextDayEventCount >= 4;

  if (selectedBusy) {
    signals.push({ domain: "calendar", key: "day-dense", weight: 2 });
  }
  if (tomorrowBusy) {
    signals.push({ domain: "calendar", key: "busy-next-day", weight: 1 });
  }
  if (input.nextThreeDaysBusy) {
    signals.push({ domain: "calendar", key: "three-day-load", weight: 2 });
  }
  if (input.hasMoneyEventSoon) {
    signals.push({ domain: "finance", key: "money-soon", weight: 1 });
  }
  if (input.hasHealthEventOnSelectedDay) {
    signals.push({ domain: "health", key: "health-today", weight: 1 });
  }

  if (selectedBusy) {
    return buildPulse(
      "refocus",
      "This day is full. Pick the one or two things that matter most.",
      signals,
    );
  }

  if (selectedLight && tomorrowBusy) {
    return buildPulse(
      "opportunity",
      "Today is lighter, but tomorrow is busy. Use this space to get ahead.",
      signals,
    );
  }

  if (input.nextThreeDaysBusy) {
    return buildPulse(
      "refocus",
      "The next few days are packed. Clear one small thing now to reduce friction.",
      signals,
    );
  }

  if (input.hasMoneyEventSoon) {
    return buildPulse(
      "steady",
      "A financial date is coming up. Nothing urgent, but it is worth keeping in view.",
      signals,
    );
  }

  if (input.hasHealthEventOnSelectedDay && input.isToday) {
    return buildPulse(
      "steady",
      "You have a health moment today. Keep it simple and follow through.",
      signals,
    );
  }

  if (
    input.isToday &&
    selectedLight &&
    !tomorrowBusy &&
    !input.nextThreeDaysBusy &&
    !input.hasMoneyEventSoon
  ) {
    return buildPulse(
      "opportunity",
      "You have open space today. Good time to move one goal forward.",
      signals,
    );
  }

  return buildPulse(
    "steady",
    "Your timeline looks manageable. Stay aware and keep moving.",
    signals,
  );
}

export type FinanceGlanceInput = {
  cashFlowHealthy: boolean;
  billsCovered: boolean;
  nextObligation?: { title: string; dateLabel: string } | null;
};

/** One-line interpretation for the finance primary view — not a dashboard summary. */
export function buildFinanceGlance(input: FinanceGlanceInput): string {
  const next = input.nextObligation;

  if (input.cashFlowHealthy && input.billsCovered) {
    if (next) {
      return `${next.title} is next. Everything else looks manageable.`;
    }
    return "Essentials look covered. Nothing urgent needs your attention.";
  }

  if (next) {
    return `${next.title} is coming up — worth a look when you have a moment.`;
  }

  return "Upcoming obligations deserve a glance when you have a moment.";
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