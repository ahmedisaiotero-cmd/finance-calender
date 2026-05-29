import type { CSSProperties } from "react";

export function categorySlug(category: string) {
  return category.toLowerCase().replace(/\s+/g, "-");
}

export function getCategoryIconStyle(category: string): CSSProperties {
  const slug = categorySlug(category);
  return {
    backgroundColor: `var(--category-${slug}-muted, var(--expense-muted))`,
    color: `var(--category-${slug}, var(--expense))`,
  };
}
