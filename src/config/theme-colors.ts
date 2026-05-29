/**
 * Customize app colors here. Values are applied as CSS variables on :root / .dark.
 * Use oklch(), hex, or any valid CSS color.
 */
export type ThemeColorSet = {
  income: string;
  incomeMuted: string;
  expense: string;
  expenseMuted: string;
  warning: string;
  warningMuted: string;
  progressFrom: string;
  progressTo: string;
  glow: string;
  avatarFrom: string;
  avatarTo: string;
  avatarText: string;
};

export const themeColors: Record<"light" | "dark", ThemeColorSet> = {
  light: {
    income: "oklch(0.52 0.14 155)",
    incomeMuted: "oklch(0.52 0.14 155 / 0.12)",
    expense: "oklch(0.25 0 0)",
    expenseMuted: "oklch(0.96 0 0)",
    warning: "oklch(0.55 0.14 65)",
    warningMuted: "oklch(0.55 0.14 65 / 0.12)",
    progressFrom: "oklch(0.2 0 0)",
    progressTo: "oklch(0.45 0 0)",
    glow: "oklch(0.52 0.14 155 / 0.15)",
    avatarFrom: "oklch(0.92 0 0)",
    avatarTo: "oklch(0.75 0 0)",
    avatarText: "oklch(0.3 0 0)",
  },
  dark: {
    income: "oklch(0.72 0.16 155)",
    incomeMuted: "oklch(0.72 0.16 155 / 0.15)",
    expense: "oklch(0.98 0 0)",
    expenseMuted: "oklch(0.28 0 0)",
    warning: "oklch(0.78 0.12 85)",
    warningMuted: "oklch(0.78 0.12 85 / 0.15)",
    progressFrom: "oklch(0.98 0 0)",
    progressTo: "oklch(0.72 0 0)",
    glow: "oklch(0.72 0.16 155 / 0.2)",
    avatarFrom: "oklch(0.42 0 0)",
    avatarTo: "oklch(0.32 0 0)",
    avatarText: "oklch(0.95 0 0)",
  },
};

/** Optional per-category icon colors (light / dark). */
export const categoryColors: Record<
  string,
  { light: { icon: string; muted: string }; dark: { icon: string; muted: string } }
> = {
  Groceries: {
    light: { icon: "oklch(0.45 0.1 250)", muted: "oklch(0.45 0.1 250 / 0.12)" },
    dark: { icon: "oklch(0.72 0.12 250)", muted: "oklch(0.72 0.12 250 / 0.15)" },
  },
  Subscriptions: {
    light: { icon: "oklch(0.48 0.14 300)", muted: "oklch(0.48 0.14 300 / 0.12)" },
    dark: { icon: "oklch(0.75 0.14 300)", muted: "oklch(0.75 0.14 300 / 0.15)" },
  },
  Income: {
    light: { icon: "oklch(0.52 0.14 155)", muted: "oklch(0.52 0.14 155 / 0.12)" },
    dark: { icon: "oklch(0.72 0.16 155)", muted: "oklch(0.72 0.16 155 / 0.15)" },
  },
  Transport: {
    light: { icon: "oklch(0.5 0.12 45)", muted: "oklch(0.5 0.12 45 / 0.12)" },
    dark: { icon: "oklch(0.78 0.12 75)", muted: "oklch(0.78 0.12 75 / 0.15)" },
  },
  Dining: {
    light: { icon: "oklch(0.5 0.14 25)", muted: "oklch(0.5 0.14 25 / 0.12)" },
    dark: { icon: "oklch(0.75 0.14 25)", muted: "oklch(0.75 0.14 25 / 0.15)" },
  },
  Shopping: {
    light: { icon: "oklch(0.48 0.12 200)", muted: "oklch(0.48 0.12 200 / 0.12)" },
    dark: { icon: "oklch(0.72 0.12 200)", muted: "oklch(0.72 0.12 200 / 0.15)" },
  },
};

export const cssVarMap: Record<keyof ThemeColorSet, string> = {
  income: "--income",
  incomeMuted: "--income-muted",
  expense: "--expense",
  expenseMuted: "--expense-muted",
  warning: "--warning",
  warningMuted: "--warning-muted",
  progressFrom: "--progress-from",
  progressTo: "--progress-to",
  glow: "--glow",
  avatarFrom: "--avatar-from",
  avatarTo: "--avatar-to",
  avatarText: "--avatar-text",
};
