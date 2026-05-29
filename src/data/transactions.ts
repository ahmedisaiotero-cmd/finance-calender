export type Transaction = {
  id: string;
  name: string;
  category: string;
  amount: number;
  /** Display label: "Today", "May 26", or ISO `YYYY-MM-DD` */
  date: string;
  /** Optional fixed ISO date — overrides `date` on the calendar */
  dateISO?: string;
  /** Optional custom accent (hex, oklch, etc.) — overrides category color */
  color?: string;
};

export const recentTransactions: Transaction[] = [
  {
    id: "1",
    name: "Whole Foods Market",
    category: "Groceries",
    amount: -84.2,
    date: "Today",
  },
  {
    id: "2",
    name: "Spotify",
    category: "Subscriptions",
    amount: -11.99,
    date: "Today",
  },
  {
    id: "3",
    name: "Direct Deposit",
    category: "Income",
    amount: 3250.0,
    date: "Yesterday",
  },
  {
    id: "4",
    name: "Shell Gas",
    category: "Transport",
    amount: -52.4,
    date: "Yesterday",
  },
  {
    id: "5",
    name: "Blue Bottle Coffee",
    category: "Dining",
    amount: -6.75,
    date: "May 26",
  },
  {
    id: "6",
    name: "Amazon",
    category: "Shopping",
    amount: -129.99,
    date: "May 25",
  },
];
