export const userProfile = {
  name: "Ahmed",
  initials: "AH",
  email: "ahmed@example.com",
  plan: "Personal",
} as const;

export const monthlySpending = {
  monthLabel: "May 2026",
  spent: 2847.32,
  budget: 4000,
  vsLastMonthPercent: -12.4,
};

export const navItems = [
  { label: "Dashboard", href: "#", active: true },
  { label: "Calendar", href: "#" },
  { label: "Transactions", href: "#" },
  { label: "Budgets", href: "#" },
  { label: "Insights", href: "#" },
] as const;
