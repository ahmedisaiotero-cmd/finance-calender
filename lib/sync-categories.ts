import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  CalendarDays,
  Dumbbell,
  LayoutDashboard,
  Receipt,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

/** Maps to Prisma `Domain` where wired; UI label may differ (e.g. Money → FINANCE). */
export type LifeCategoryId =
  | "money"
  | "health"
  | "career"
  | "relationships"
  | "personal";

export type PrimaryNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type LifeCategoryNavItem = {
  id: LifeCategoryId;
  label: string;
  icon: LucideIcon;
  href?: string;
  enabled: boolean;
  prismaDomain?: "FINANCE" | "HEALTH" | "GENERAL";
};

export type MoneySubNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const primaryNavItems: PrimaryNavItem[] = [
  { label: "Home", href: "/", icon: LayoutDashboard },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
];

export const lifeCategoryNavItems: LifeCategoryNavItem[] = [
  {
    id: "money",
    label: "Money",
    icon: Wallet,
    href: "/calendar",
    enabled: true,
    prismaDomain: "FINANCE",
  },
  {
    id: "health",
    label: "Health",
    icon: Dumbbell,
    href: "/fitness",
    enabled: true,
    prismaDomain: "HEALTH",
  },
  {
    id: "career",
    label: "Career",
    icon: Briefcase,
    enabled: false,
  },
  {
    id: "relationships",
    label: "Relationships",
    icon: Users,
    enabled: false,
  },
  {
    id: "personal",
    label: "Personal",
    icon: Sparkles,
    enabled: false,
  },
];

/** Money tools stay on Calendar via hash sections (no /money hub). */
export const moneySubNavItems: MoneySubNavItem[] = [
  { label: "Transactions", href: "/calendar#transactions", icon: Receipt },
  { label: "Budgets", href: "/calendar#budgets", icon: Wallet },
];
