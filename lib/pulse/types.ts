export type PulsePlanCategory =
  | "workout"
  | "workday"
  | "date-night"
  | "subscription"
  | "expense"
  | "reminder"
  | "savings-goal"
  | "task"
  | "general";

export type PulsePlanStatus = "draft" | "saved" | "scheduled";

export type PulsePlanFrequency =
  | "one-time"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly";

export type PulseMoneyType =
  | "income"
  | "expense"
  | "subscription"
  | "transfer"
  | "unknown";

export type PulsePlanItem = {
  id: string;
  label: string;
  completed: boolean;
};

export type PulsePlanSection = {
  id: string;
  title: string;
  items: PulsePlanItem[];
};

export type PulseParsedInput = {
  category: PulsePlanCategory;
  amount?: string | null;
  merchant?: string | null;
  dateLabel?: string;
  timeLabel?: string;
  frequency?: PulsePlanFrequency;
  moneyType?: PulseMoneyType;
};

export type PulseCalendarSuggestion = {
  title: string;
  dateLabel: string;
  timeLabel: string;
  durationMinutes: number;
};

export type PulsePlan = {
  id: string;
  title: string;
  category: PulsePlanCategory;
  status: PulsePlanStatus;
  prompt: string;
  summary: string;
  dateLabel: string;
  timeLabel: string;
  durationMinutes: number;
  sections: PulsePlanSection[];
  calendarSuggestion?: PulseCalendarSuggestion;
  parsedInput?: PulseParsedInput;
  createdAt: string;
};
