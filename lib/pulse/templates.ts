import {
  extractSubject,
  titleCaseKeep,
} from "@/lib/pulse/parse-pulse-prompt";
import type {
  PulseParsedInput,
  PulsePlanCategory,
  PulsePlanSection,
} from "@/lib/pulse/types";

export type PulseDraftSection = {
  title: string;
  items: string[];
};

export type PulseTemplateResult = {
  title: string;
  summary: string;
  durationMinutes: number;
  sections: PulseDraftSection[];
  includeCalendar: boolean;
  /** Short description of the Sync item this plan will create. */
  previewLabel: string;
};

const FREQUENCY_LABELS: Record<NonNullable<PulseParsedInput["frequency"]>, string> = {
  "one-time": "One-time",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

function frequencyLabel(parsed: PulseParsedInput): string {
  return FREQUENCY_LABELS[parsed.frequency ?? "one-time"];
}

function friendlyWhen(label: string | undefined): string {
  if (!label || label === "Upcoming" || label === "Flexible") return "soon";
  return label.toLowerCase();
}

function relationshipTitle(prompt: string, fallback: string): string {
  const dateWith = prompt.match(
    /\bdate\s+(?:night\s+)?(?:with\s+)?(?:my\s+)?(girlfriend|boyfriend|wife|husband|partner)\b/i,
  );
  if (dateWith) {
    return `Date with ${titleCaseKeep(dateWith[1])}`;
  }

  const callMatch = prompt.match(
    /\bcall\s+(mom|dad|mother|father|grandma|grandpa)\b/i,
  );
  if (callMatch) {
    const labels: Record<string, string> = {
      mom: "Mom",
      mother: "Mom",
      dad: "Dad",
      father: "Dad",
      grandma: "Grandma",
      grandpa: "Grandpa",
    };
    return `Call ${labels[callMatch[1].toLowerCase()] ?? titleCaseKeep(callMatch[1])}`;
  }

  return derivePlanTitle(prompt, fallback);
}

export function familyEventTitle(prompt: string): string | null {
  const daughter = /\b(?:my\s+)?daughter\b/i.test(prompt);
  const son = /\b(?:my\s+)?son\b/i.test(prompt);
  const school = /\b(school|class|recital|ceremony|graduation)\b/i.test(prompt);
  const event = /\bevent\b/i.test(prompt);

  if (daughter && (school || event)) return "Daughter's School Event";
  if (son && (school || event)) return "Son's School Event";
  if (daughter) return "Daughter's Event";
  if (son) return "Son's Event";
  if (/\bdoctor\b/i.test(prompt) && /\bappointment\b/i.test(prompt)) {
    return "Doctor Appointment";
  }
  if (/\bdoctor\b/i.test(prompt)) return "Doctor Appointment";

  return null;
}

/** Capitalize the first letter only, preserving the rest of the prompt. */
function derivePlanTitle(prompt: string, fallback: string): string {
  const cleaned = prompt
    .trim()
    .replace(/^(i|we)\s+/i, "")
    .replace(
      /^(organize|plan|schedule|set up|create|need to|have to|have|had|going to|will)\s+(a|an|my)?\s*/i,
      "",
    )
    .replace(
      /\s+(for|on|at|from|tonight|today|tomorrow|this|next)\s+.*/i,
      "",
    )
    .replace(
      /\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b.*$/i,
      "",
    )
    .trim();

  if (!cleaned) return fallback;
  return titleCaseKeep(cleaned.replace(/\bmy\s+/gi, "")).replace(
    /\b(With|For|On|At|To|In)\b/g,
    (word) => word.toLowerCase(),
  );
}

function buildWorkout(prompt: string): PulseTemplateResult {
  return {
    title: derivePlanTitle(prompt, "Workout Session"),
    summary: "A balanced session with warm-up, main work, and recovery.",
    durationMinutes: 45,
    includeCalendar: true,
    previewLabel: "A workout block on your calendar",
    sections: [
      { title: "Warm-up", items: ["5 min light cardio", "Dynamic stretches"] },
      {
        title: "Main workout",
        items: [
          "Primary compound movement",
          "Accessory exercises (2–3 sets)",
          "Core finisher",
        ],
      },
      {
        title: "Cool down",
        items: ["Static stretching", "Hydrate and log session"],
      },
    ],
  };
}

function buildWorkSchedule(): PulseTemplateResult {
  return {
    title: "Work Schedule",
    summary: "Your standing weekly work rhythm for Sync to understand your week.",
    durationMinutes: 600,
    includeCalendar: true,
    previewLabel: "A weekly work schedule that repeats until you change it",
    sections: [
      {
        title: "Schedule",
        items: [
          "Repeats weekly on your work days",
          "Stays active until you update or remove it",
        ],
      },
    ],
  };
}

function buildWorkday(prompt: string): PulseTemplateResult {
  return {
    title: derivePlanTitle(prompt, "Focused Workday"),
    summary: "Structure your day around deep work, admin, and a clean wrap-up.",
    durationMinutes: 480,
    includeCalendar: true,
    previewLabel: "A workday outline on your calendar",
    sections: [
      {
        title: "Morning focus",
        items: ["Review top 3 priorities", "Deep work block (90 min)"],
      },
      {
        title: "Afternoon",
        items: ["Meetings and collaboration", "Admin and inbox sweep"],
      },
      {
        title: "Wrap-up",
        items: ["Log progress on key tasks", "Set tomorrow's top priority"],
      },
    ],
  };
}

function buildDateNight(prompt: string): PulseTemplateResult {
  return {
    title: relationshipTitle(prompt, "Date Night"),
    summary: "A relaxed evening with a little prep and room to enjoy the moment.",
    durationMinutes: 180,
    includeCalendar: true,
    previewLabel: "A date night on your calendar",
    sections: [
      {
        title: "Prep",
        items: ["Confirm reservation or plan", "Get ready at a calm pace"],
      },
      {
        title: "Outing",
        items: ["Dinner or activity", "Leave phones aside for the main event"],
      },
      {
        title: "After",
        items: ["Optional dessert or walk", "Wind down together"],
      },
    ],
  };
}

function buildSubscription(parsed: PulseParsedInput): PulseTemplateResult {
  const merchant = parsed.merchant ? titleCaseKeep(parsed.merchant) : null;
  const amount = parsed.amount;
  const freq = frequencyLabel(parsed);

  const details = [
    `Merchant: ${merchant ?? "—"}`,
    `Amount: ${amount ?? "—"}`,
    `Frequency: ${freq}`,
  ];
  if (parsed.dateLabel === "Today") {
    details.push("Next charge: Same day next month");
  }

  return {
    title: merchant ? `${merchant} Subscription` : "Subscription",
    summary: `${freq} subscription captured${amount ? ` for ${amount}` : ""}.`,
    durationMinutes: 0,
    includeCalendar: false,
    previewLabel: "A subscription in your finances",
    sections: [
      { title: "Details", items: details },
      { title: "Next action", items: ["Review before next charge"] },
    ],
  };
}

function buildExpense(parsed: PulseParsedInput): PulseTemplateResult {
  if (parsed.moneyType === "income") {
    const amount = parsed.amount;

    return {
      title: "Upcoming Paycheck",
      summary: `Incoming money captured${amount ? ` for ${amount}` : ""}.`,
      durationMinutes: 0,
      includeCalendar: parsed.dateLabel !== "Upcoming" && parsed.dateLabel !== "Today",
      previewLabel: "Incoming money in your finances",
      sections: [
        {
          title: "Incoming",
          items: [
            `Amount: ${amount ?? "—"}`,
            `Date: ${parsed.dateLabel ?? "Upcoming"}`,
          ],
        },
      ],
    };
  }

  const subject = parsed.merchant ? titleCaseKeep(parsed.merchant) : null;
  const amount = parsed.amount;

  return {
    title: subject ? `${subject} Expense` : "Expense",
    summary: `Expense captured${amount ? ` for ${amount}` : ""}.`,
    durationMinutes: 0,
    includeCalendar: false,
    previewLabel: "A logged expense in your finances",
    sections: [
      {
        title: "Details",
        items: [
          `Category: ${subject ?? "General"}`,
          `Amount: ${amount ?? "—"}`,
          `Date: ${parsed.dateLabel ?? "Today"}`,
        ],
      },
    ],
  };
}

function buildReminder(
  prompt: string,
  parsed: PulseParsedInput,
): PulseTemplateResult {
  const subject = extractSubject(prompt, "reminder");
  const subjectTitle = subject ? titleCaseKeep(subject) : null;

  return {
    title: subjectTitle ? `${subjectTitle} Reminder` : "Reminder",
    summary: `Reminder prepared for ${friendlyWhen(parsed.dateLabel)}.`,
    durationMinutes: 15,
    includeCalendar: true,
    previewLabel: "A reminder on your calendar",
    sections: [
      {
        title: "Reminder",
        items: [subjectTitle ?? "Follow up", `When: ${parsed.dateLabel ?? "Upcoming"}`],
      },
      {
        title: "Next action",
        items: ["Confirm the date", "Set a notification"],
      },
    ],
  };
}

function buildSavingsGoal(
  prompt: string,
  parsed: PulseParsedInput,
): PulseTemplateResult {
  const subject = extractSubject(prompt, "savings-goal");
  const subjectTitle = subject ? titleCaseKeep(subject) : null;

  const goalItems = [subjectTitle ? `Save for ${subjectTitle}` : "Define your goal"];
  if (parsed.amount) goalItems.push(`Target: ${parsed.amount}`);

  return {
    title: subjectTitle ? `${subjectTitle} Savings Goal` : "Savings Goal",
    summary: "Savings goal created.",
    durationMinutes: 0,
    includeCalendar: false,
    previewLabel: "A savings goal in your finances",
    sections: [
      { title: "Goal", items: goalItems },
      {
        title: "Suggested next steps",
        items: [
          "Set a target amount",
          "Pick a monthly contribution",
          "Track progress in Finance",
        ],
      },
    ],
  };
}

function buildTask(
  prompt: string,
  parsed: PulseParsedInput,
): PulseTemplateResult {
  const familyTitle = familyEventTitle(prompt);
  const subject = extractSubject(prompt, "task");
  const subjectTitle = familyTitle ?? (subject ? titleCaseKeep(subject) : null);
  const whenLabel =
    parsed.timeLabel && parsed.timeLabel !== "Flexible"
      ? parsed.timeLabel
      : (parsed.dateLabel ?? "Upcoming");

  return {
    title: subjectTitle ?? "New Task",
    summary: `Task organized for ${friendlyWhen(whenLabel)}.`,
    durationMinutes: 30,
    includeCalendar: false,
    previewLabel: "A task on your calendar",
    sections: [
      {
        title: "Task",
        items: [subjectTitle ?? "Get it done", `When: ${whenLabel}`],
      },
      {
        title: "Steps",
        items: [
          "Break it into one clear step",
          "Start with the smallest action",
        ],
      },
    ],
  };
}

function buildGeneral(prompt: string): PulseTemplateResult {
  const familyTitle = familyEventTitle(prompt);
  return {
    title: familyTitle ?? derivePlanTitle(prompt, "Personal Plan"),
    summary: "A simple structure to turn your intent into clear next steps.",
    durationMinutes: 60,
    includeCalendar: true,
    previewLabel: "A plan you can act on",
    sections: [
      {
        title: "Plan",
        items: ["Clarify the goal", "Block time on your calendar"],
      },
      {
        title: "Actions",
        items: ["First small step", "Follow-up or check-in"],
      },
    ],
  };
}

export function buildPulseTemplate(
  category: PulsePlanCategory,
  prompt: string,
  parsed: PulseParsedInput,
): PulseTemplateResult {
  switch (category) {
    case "workout":
      return buildWorkout(prompt);
    case "workday":
      return buildWorkday(prompt);
    case "work-schedule":
      return buildWorkSchedule();
    case "date-night":
      return buildDateNight(prompt);
    case "subscription":
      return buildSubscription(parsed);
    case "expense":
      return buildExpense(parsed);
    case "reminder":
      return buildReminder(prompt, parsed);
    case "savings-goal":
      return buildSavingsGoal(prompt, parsed);
    case "task":
      return buildTask(prompt, parsed);
    case "general":
    default:
      return buildGeneral(prompt);
  }
}

/** Assign stable ids to draft sections/items for a given plan. */
export function materializeSections(
  planId: string,
  sections: PulseDraftSection[],
): PulsePlanSection[] {
  return sections.map((section, sectionIndex) => ({
    id: `${planId}-section-${sectionIndex}`,
    title: section.title,
    items: section.items.map((label, itemIndex) => ({
      id: `${planId}-item-${sectionIndex}-${itemIndex}`,
      label,
      completed: false,
    })),
  }));
}
