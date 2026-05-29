export type CategoryBudget = {
  category: string;
  limit: number;
};

export const categoryBudgets: CategoryBudget[] = [
  { category: "Groceries", limit: 500 },
  { category: "Dining", limit: 200 },
  { category: "Transport", limit: 250 },
  { category: "Shopping", limit: 300 },
  { category: "Subscriptions", limit: 75 },
  { category: "Utilities", limit: 150 },
  { category: "Housing", limit: 2000 },
];
