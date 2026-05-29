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
  { label: "Dashboard", href: "/" },
  { label: "Calendar", href: "/calendar" },
  { label: "Transactions", href: "#" },
  { label: "Budgets", href: "#" },
  { label: "Insights", href: "#" },
] as const;

export const dashboardQuickStats = [
  {
    label: "Income this month",
    value: "$6,500",
    hint: "+8% from April",
  },
  {
    label: "Upcoming bills",
    value: "3 due",
    hint: "$412 within 7 days",
  },
] as const;
