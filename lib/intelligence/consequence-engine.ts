import type { SyncUserContext } from "@/lib/intelligence/sync-user-context";
import type { TimelineResolution } from "@/lib/timeline/resolve-timeline";

export type AffectedArea = {
  area:
    | "calendar"
    | "finance"
    | "health"
    | "work"
    | "school"
    | "goals"
    | "relationships"
    | "home"
    | "travel";
  impact: "positive" | "negative" | "neutral" | "unknown";
  reason: string;
};

export type ConsequenceInsight = {
  id: string;
  area: AffectedArea["area"];
  message: string;
  severity: "info" | "notice" | "important";
};

export type SuggestedAction = {
  id: string;
  label: string;
  area: AffectedArea["area"];
  actionType:
    | "add_reminder"
    | "adjust_plan"
    | "create_task"
    | "review_budget"
    | "schedule_time"
    | "log_time"
    | "none";
  requiresConfirmation: boolean;
};

export type ConsequenceAnalysis = {
  summary: string;
  affectedAreas: AffectedArea[];
  insights: ConsequenceInsight[];
  suggestedActions: SuggestedAction[];
  confidence: number;
};

type AnalyzeConsequencesInput = {
  captureText: string;
  category: string;
  destinations: string[];
  timeline?: TimelineResolution;
  userContext?: SyncUserContext;
};

function addAffected(
  areas: AffectedArea[],
  area: AffectedArea["area"],
  impact: AffectedArea["impact"],
  reason: string,
) {
  if (areas.some((item) => item.area === area && item.reason === reason)) return;
  areas.push({ area, impact, reason });
}

function addInsight(
  insights: ConsequenceInsight[],
  area: AffectedArea["area"],
  message: string,
  severity: ConsequenceInsight["severity"] = "info",
) {
  const id = `${area}-${insights.length + 1}`;
  insights.push({ id, area, message, severity });
}

function addAction(
  actions: SuggestedAction[],
  area: AffectedArea["area"],
  label: string,
  actionType: SuggestedAction["actionType"],
) {
  if (actions.some((item) => item.label === label)) return;
  actions.push({
    id: `${area}-${actions.length + 1}`,
    area,
    label,
    actionType,
    requiresConfirmation: true,
  });
}

function amountFromText(text: string) {
  const match = text.match(/\$?\s?(\d+(?:\.\d{1,2})?)\s*(?:dollars?|bucks?)?/) ;
  if (!match) return null;
  return Number(match[1]);
}

function isWorkRelated(text: string, category: string, destinations: string[]) {
  return (
    category === "workday" ||
    destinations.includes("Work") ||
    /\b(work|worked|shift|job|overtime)\b/.test(text)
  );
}

function isExtraWork(text: string) {
  return /\b(extra shift|picked up|overtime|more hours|covered|covering)\b/.test(
    text,
  );
}

function hasRoutineConflict(
  userContext: SyncUserContext | undefined,
  timeline: TimelineResolution | undefined,
  area: "health" | "goals",
) {
  if (!timeline?.startDate && !timeline?.recurrence?.days?.length) return false;
  return (
    userContext?.routines?.some((routine) => {
      if (routine.area !== area) return false;
      if (!routine.days?.length) return true;
      return timeline.recurrence?.days?.some((day) => routine.days?.includes(day));
    }) ?? false
  );
}

function isFinanceRelated(text: string, category: string, destinations: string[]) {
  return (
    category === "expense" ||
    category === "subscription" ||
    category === "savings-goal" ||
    destinations.includes("Finance") ||
    /\b(spent|paid|payday|get paid|income|rent|bill|budget|car payment)\b/.test(
      text,
    )
  );
}

function isHealthRelated(text: string, category: string, destinations: string[]) {
  return (
    category === "workout" ||
    destinations.includes("Health") ||
    /\b(gym|workout|sleep|slept|sick|tired|missed)\b/.test(text)
  );
}

function isGoalRelated(text: string, category: string, destinations: string[]) {
  if (
    category === "date-night" ||
    destinations.includes("Relationships") ||
    /\b(mom|dad|call|birthday|anniversary|friend|dinner with)\b/.test(text)
  ) {
    return false;
  }

  return (
    category === "task" ||
    category === "savings-goal" ||
    destinations.includes("Goals") ||
    /\b(sync|business|project|studied|study|goal)\b/.test(text)
  );
}

function isRelationshipRelated(
  text: string,
  category: string,
  destinations: string[],
) {
  return (
    category === "date-night" ||
    destinations.includes("Relationships") ||
    /\b(mom|dad|mother|father|parent|grandma|grandpa|family|friend|friends|partner|wife|husband|girlfriend|boyfriend|anniversary|birthday|call|dinner with)\b/.test(
      text,
    )
  );
}

export function analyzeConsequences(
  input: AnalyzeConsequencesInput,
): ConsequenceAnalysis {
  const text = input.captureText.trim().toLowerCase();
  const affectedAreas: AffectedArea[] = [];
  const insights: ConsequenceInsight[] = [];
  const suggestedActions: SuggestedAction[] = [];

  if (input.destinations.includes("Calendar") || input.timeline?.startDate) {
    addAffected(affectedAreas, "calendar", "neutral", "Adds structure to your timeline.");
  }

  if (isWorkRelated(text, input.category, input.destinations)) {
    addAffected(affectedAreas, "work", "neutral", "This changes your work rhythm.");
    addInsight(insights, "work", "Work time may shape the rest of that day.", "info");

    if (isExtraWork(text)) {
      addAffected(affectedAreas, "finance", "positive", "Extra work may mean added income.");
      addInsight(insights, "finance", "Possible added income from this shift.", "notice");
      addAction(suggestedActions, "calendar", "Review this week's free time", "adjust_plan");
    }

    if (hasRoutineConflict(input.userContext, input.timeline, "health") || isExtraWork(text)) {
      addAffected(affectedAreas, "health", "negative", "Less open time for recovery or gym.");
      addInsight(insights, "health", "Recovery or gym time may be tighter.", "notice");
      addAction(suggestedActions, "health", "Schedule recovery block", "schedule_time");
    }

    if (hasRoutineConflict(input.userContext, input.timeline, "goals") || isExtraWork(text)) {
      addAffected(affectedAreas, "goals", "negative", "Project time may be tighter.");
      addInsight(insights, "goals", "Project time may need a small adjustment.", "notice");
      addAction(suggestedActions, "goals", "Adjust project plan", "adjust_plan");
    }
  }

  if (isFinanceRelated(text, input.category, input.destinations)) {
    const amount = amountFromText(text);
    const income = /\b(get paid|payday|income|deposit)\b/.test(text);
    const deadline = input.timeline?.timelineRole === "deadline" || /\b(due|by|before)\b/.test(text);

    addAffected(
      affectedAreas,
      "finance",
      income ? "positive" : "negative",
      income ? "Adds expected money." : "Changes your money picture.",
    );

    if (income) {
      addInsight(insights, "finance", "Incoming money may help your plan.", "info");
    } else if (amount && amount >= 500) {
      addInsight(insights, "finance", "This is a larger money event.", "important");
      addAction(suggestedActions, "finance", "Review budget impact", "review_budget");
      if (input.userContext?.goals?.some((goal) => goal.area === "finance")) {
        addAffected(affectedAreas, "goals", "negative", "Savings goals may be affected.");
        addInsight(insights, "goals", "Savings goals may need a quick check.", "notice");
      }
    }

    if (deadline) {
      addAffected(affectedAreas, "calendar", "neutral", "There is a due date to remember.");
      addInsight(insights, "finance", "This has a financial deadline.", "notice");
      addAction(suggestedActions, "finance", "Add reminder", "add_reminder");
    }
  }

  if (isHealthRelated(text, input.category, input.destinations)) {
    const negative = /\b(missed|sick|tired|poor sleep|bad sleep)\b/.test(text);
    addAffected(
      affectedAreas,
      "health",
      negative ? "negative" : "positive",
      negative ? "This may affect your energy." : "This supports your health rhythm.",
    );
    addInsight(
      insights,
      "health",
      negative ? "Health rhythm may need a reset." : "This supports your health rhythm.",
      negative ? "notice" : "info",
    );
    if (negative) addAction(suggestedActions, "health", "Reset workout plan", "adjust_plan");
  }

  if (isRelationshipRelated(text, input.category, input.destinations)) {
    addAffected(
      affectedAreas,
      "relationships",
      "positive",
      "Helps maintain an important relationship.",
    );
    addInsight(
      insights,
      "relationships",
      "This supports someone important to you.",
      "info",
    );
  }

  if (isGoalRelated(text, input.category, input.destinations)) {
    const negative = /\b(missed|skip|skipped|didn't|not enough)\b/.test(text);
    addAffected(
      affectedAreas,
      "goals",
      negative ? "negative" : "positive",
      negative ? "A plan may need adjustment." : "This moves a project or goal forward.",
    );
    addInsight(
      insights,
      "goals",
      negative ? "Goal time may need a reset." : "This looks like progress on a goal.",
      negative ? "notice" : "info",
    );
    if (!input.timeline?.isTimed) {
      addAction(suggestedActions, "goals", "Schedule next block", "schedule_time");
    }
  }

  const summary =
    insights[0]?.message ??
    (affectedAreas.length > 0
      ? "This may affect a few areas of your life."
      : "No major ripple effects detected.");

  return {
    summary,
    affectedAreas,
    insights: insights.slice(0, 4),
    suggestedActions: suggestedActions.slice(0, 3),
    confidence: affectedAreas.length > 0 ? 0.78 : 0.45,
  };
}
