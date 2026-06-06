/** Display fallbacks when live transaction data is sparse. */
export const moneyBudgetSpendingFallback: Record<string, number> = {
  Groceries: 420,
  Dining: 110,
  Transport: 198,
  Shopping: 245,
  Subscriptions: 42,
  Utilities: 94,
  Housing: 1800,
};

export type MoneyUpcomingEvent = {
  id: string;
  dateLabel: string;
  title: string;
  amount: number;
};

export type MoneyActivityItem = {
  id: string;
  name: string;
  amount: number;
};

export const moneyRecentActivityFallback: MoneyActivityItem[] = [
  { id: "fallback-1", name: "Spotify", amount: -11.99 },
  { id: "fallback-2", name: "Costco", amount: -142.18 },
  { id: "fallback-3", name: "Paycheck", amount: 1945 },
];

export function buildUpcomingMoneyEvents(reference = new Date()): MoneyUpcomingEvent[] {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const today = reference.getDate();

  const items = [
    { day: 15, title: "Rent", amount: 1200 },
    { day: 18, title: "Electric Bill", amount: 110 },
    { day: 22, title: "Credit Card Payment", amount: 250 },
  ];

  return items
    .filter((item) => item.day >= today)
    .map((item) => ({
      id: `upcoming-${item.day}`,
      dateLabel: new Date(year, month, item.day).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      title: item.title,
      amount: item.amount,
    }));
}
