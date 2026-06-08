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
    income: "oklch(0.56 0.09 145)",
    incomeMuted: "oklch(0.88 0.052 138 / 0.72)",
    expense: "oklch(0.35 0.025 82)",
    expenseMuted: "oklch(0.96 0.01 260)",
    warning: "oklch(0.62 0.105 72)",
    warningMuted: "oklch(0.62 0.105 72 / 0.12)",
    progressFrom: "oklch(0.56 0.09 145)",
    progressTo: "oklch(0.67 0.08 145)",
    glow: "oklch(0.56 0.09 145 / 0.16)",
    avatarFrom: "oklch(0.84 0.045 132)",
    avatarTo: "oklch(0.66 0.06 145)",
    avatarText: "oklch(0.22 0.02 145)",
  },
  dark: {
    income: "oklch(0.72 0.09 145)",
    incomeMuted: "oklch(0.58 0.075 145 / 0.24)",
    expense: "oklch(0.88 0.014 92)",
    expenseMuted: "oklch(0.32 0.018 92)",
    warning: "oklch(0.78 0.1 82)",
    warningMuted: "oklch(0.78 0.1 82 / 0.15)",
    progressFrom: "oklch(0.66 0.09 145)",
    progressTo: "oklch(0.76 0.075 145)",
    glow: "oklch(0.66 0.08 145 / 0.18)",
    avatarFrom: "oklch(0.36 0.035 145)",
    avatarTo: "oklch(0.28 0.022 98)",
    avatarText: "oklch(0.9 0.018 92)",
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
    light: { icon: "oklch(0.55 0.14 92)", muted: "oklch(0.94 0.06 95)" },
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
