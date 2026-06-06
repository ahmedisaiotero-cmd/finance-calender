export type FinanceObligation = {
  id: string;
  dateLabel: string;
  title: string;
  amount: number;
};

export type SpendingRhythmItem = {
  category: string;
  state: string;
};

export type FinanceGoalImpact = {
  id: string;
  name: string;
  status: string;
};

export type MeaningfulActivityItem = {
  id: string;
  title: string;
};

export const financeSnapshot = {
  availableToSpend: 1240,
  upcomingBillsTotal: 1536,
  savingsGoalsStatus: "On pace",
  cashFlowStatus: "Healthy",
};

export const upcomingObligations: FinanceObligation[] = [
  { id: "o1", dateLabel: "Jun 12", title: "Phone Bill", amount: 86 },
  { id: "o2", dateLabel: "Jun 14", title: "Credit Card Payment", amount: 240 },
  { id: "o3", dateLabel: "Jun 21", title: "Rent", amount: 1200 },
];

export const spendingRhythm: SpendingRhythmItem[] = [
  { category: "Groceries", state: "Normal" },
  { category: "Dining", state: "Elevated" },
  { category: "Subscriptions", state: "Stable" },
  { category: "Transport", state: "Lower" },
];

export const goalsImpact: FinanceGoalImpact[] = [
  { id: "g1", name: "Emergency Fund", status: "On pace" },
  { id: "g2", name: "Vacation Fund", status: "Ahead" },
  { id: "g3", name: "Business Fund", status: "Next in 5 days" },
];

export const meaningfulActivity: MeaningfulActivityItem[] = [
  { id: "a1", title: "Paycheck deposited" },
  { id: "a2", title: "Amazon purchase" },
  { id: "a3", title: "Amex payment" },
];

export const financeSources = {
  institutions: ["Chase", "Amex", "Fidelity"],
  lastUpdatedMinutes: 12,
};
