export type MobilePrototypeScreen =
  | "welcome"
  | "name"
  | "week"
  | "priorities"
  | "awareness"
  | "coming-up"
  | "building"
  | "brief";

export type OnboardingData = {
  name: string;
  typicalWeek: string;
  priorities: string[];
  awareness: string[];
  comingUp: string;
};

export type BriefingSection = {
  title: "Today" | "Worth Noticing" | "Possibility";
  items: string[];
};

export type DailyBrief = {
  greeting: string;
  sections: BriefingSection[];
};

export const PRIORITY_CHIPS = [
  "Money",
  "Health",
  "Family",
  "Work",
  "Goals",
  "Home",
] as const;

export const AWARENESS_CHIPS = [
  "Time",
  "Money",
  "Health",
  "Relationships",
  "Work",
  "Goals",
] as const;

export const CAPTURE_EXAMPLES = [
  "I worked overtime today.",
  "Remind me to call mom Friday.",
  "I spent $40 on groceries.",
  "I want to start going to the gym again.",
] as const;

function greetingForHour(hour: number, name: string) {
  const trimmed = name.trim() || "there";
  if (hour < 12) return `Good morning, ${trimmed}.`;
  if (hour < 17) return `Good afternoon, ${trimmed}.`;
  return `Good evening, ${trimmed}.`;
}

function includesAny(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term.toLowerCase()));
}

export function buildDailyBrief(data: OnboardingData, now = new Date()): DailyBrief {
  const today: string[] = [];
  const noticing: string[] = [];
  const possibility: string[] = [];

  const week = data.typicalWeek;
  const upcoming = data.comingUp;

  if (includesAny(week, ["11 am", "11am", "11:00"])) {
    today.push("Work starts at 11 AM");
  } else if (data.priorities.includes("Work") || data.awareness.includes("Work")) {
    today.push("Work is part of your typical week");
  }

  if (includesAny(week, ["9 pm", "9pm", "21:00"])) {
    today.push("Open evening after 9 PM");
  }

  if (includesAny(upcoming, ["payday", "pay day", "friday"])) {
    today.push("Payday in 6 days");
  }

  if (
    data.awareness.includes("Health") ||
    data.priorities.includes("Health")
  ) {
    noticing.push("You haven't exercised in 3 days");
  }

  if (includesAny(upcoming, ["birthday", "mom", "mother"])) {
    noticing.push("Mom's birthday is in 10 days");
  }

  if (includesAny(upcoming, ["trip", "travel", "vacation"])) {
    noticing.push("Your trip is coming up next month");
  }

  if (data.priorities.includes("Money") || data.awareness.includes("Money")) {
    noticing.push("Spending is worth a quick check this week");
  }

  if (week.trim()) {
    possibility.push("You have two free evenings this week");
  }

  if (
    data.priorities.includes("Goals") ||
    data.awareness.includes("Goals")
  ) {
    possibility.push("A small goal step could fit into a quieter evening");
  }

  if (today.length === 0) {
    today.push("Nothing urgent on the calendar today");
  }

  if (noticing.length === 0) {
    noticing.push("No patterns need attention right now");
  }

  if (possibility.length === 0) {
    possibility.push("There is room in the week if something new comes up");
  }

  return {
    greeting: greetingForHour(now.getHours(), data.name),
    sections: [
      { title: "Today", items: today.slice(0, 4) },
      { title: "Worth Noticing", items: noticing.slice(0, 3) },
      { title: "Possibility", items: possibility.slice(0, 2) },
    ],
  };
}

export const EMPTY_ONBOARDING: OnboardingData = {
  name: "",
  typicalWeek: "",
  priorities: [],
  awareness: [],
  comingUp: "",
};
