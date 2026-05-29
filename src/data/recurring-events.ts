export type RecurringEvent = {
  id: string;
  title: string;
  category: string;
  amount: number;
  /** Day of month (1–31). Uses last day if month is shorter (e.g. 31 → Feb 28). */
  dayOfMonth: number;
};

/** Bills and income that repeat every month. */
export const recurringBills: RecurringEvent[] = [
  {
    id: "rent",
    title: "Rent",
    category: "Housing",
    amount: -1800,
    dayOfMonth: 1,
  },
  {
    id: "paycheck",
    title: "Direct Deposit",
    category: "Income",
    amount: 3250,
    dayOfMonth: 15,
  },
  {
    id: "electric",
    title: "Electric bill",
    category: "Utilities",
    amount: -94.5,
    dayOfMonth: 18,
  },
  {
    id: "spotify",
    title: "Spotify",
    category: "Subscriptions",
    amount: -11.99,
    dayOfMonth: 28,
  },
  {
    id: "netflix",
    title: "Netflix",
    category: "Subscriptions",
    amount: -15.99,
    dayOfMonth: 30,
  },
];
