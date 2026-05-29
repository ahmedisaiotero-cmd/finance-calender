"use client";

import { useEffect } from "react";

import { useTheme } from "@/components/theme-provider";
import {
  categoryColors,
  cssVarMap,
  themeColors,
  type ThemeColorSet,
} from "@/src/config/theme-colors";

function applyColorSet(root: HTMLElement, colors: ThemeColorSet) {
  (Object.keys(cssVarMap) as (keyof ThemeColorSet)[]).forEach((key) => {
    root.style.setProperty(cssVarMap[key], colors[key]);
  });
}

function applyCategoryColors(root: HTMLElement, mode: "light" | "dark") {
  Object.entries(categoryColors).forEach(([category, palette]) => {
    const slug = category.toLowerCase().replace(/\s+/g, "-");
    const { icon, muted } = palette[mode];
    root.style.setProperty(`--category-${slug}`, icon);
    root.style.setProperty(`--category-${slug}-muted`, muted);
  });
}

export function ThemeColorsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, mounted } = useTheme();

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    applyColorSet(root, themeColors[theme]);
    applyCategoryColors(root, theme);
  }, [theme, mounted]);

  return <>{children}</>;
}
