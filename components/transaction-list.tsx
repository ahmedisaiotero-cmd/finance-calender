import type { CSSProperties, ElementType } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Coffee,
  Fuel,
  Music,
  ShoppingBag,
  ShoppingCart,
  Wallet,
} from "lucide-react";

import { getCategoryIconStyle } from "@/lib/category-style";
import type { Transaction } from "@/src/data/transactions";
import { cn } from "@/lib/utils";

const categoryIcons: Record<string, ElementType> = {
  Groceries: ShoppingCart,
  Subscriptions: Music,
  Income: Wallet,
  Transport: Fuel,
  Dining: Coffee,
  Shopping: ShoppingBag,
};

function formatAmount(amount: number) {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.abs(amount));

  return amount >= 0 ? `+${formatted}` : `−${formatted}`;
}

function iconStyle(tx: Transaction): CSSProperties {
  if (tx.color) {
    return {
      backgroundColor: `color-mix(in oklch, ${tx.color} 12%, transparent)`,
      color: tx.color,
    };
  }
  if (tx.amount >= 0) {
    return {
      backgroundColor: "var(--income-muted)",
      color: "var(--income)",
    };
  }
  return getCategoryIconStyle(tx.category);
}

type TransactionListProps = {
  transactions: Transaction[];
  className?: string;
  emptyMessage?: string;
};

export function TransactionList({
  transactions,
  className,
  emptyMessage = "No transactions yet.",
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <p
        className={cn(
          "px-6 py-10 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className={cn("divide-y divide-border/60", className)}>
      {transactions.map((tx) => {
        const Icon = categoryIcons[tx.category] ?? ShoppingBag;
        const isIncome = tx.amount >= 0;

        return (
          <li
            key={tx.id}
            className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/30"
          >
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
              style={iconStyle(tx)}
            >
              <Icon className="size-5" strokeWidth={1.75} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{tx.name}</p>
              <p className="text-sm text-muted-foreground">{tx.category}</p>
            </div>

            <div className="text-right">
              <p
                className={cn(
                  "font-semibold tabular-nums tracking-tight",
                  !tx.color && isIncome && "text-income",
                  !tx.color && !isIncome && "text-expense",
                )}
                style={
                  tx.color
                    ? { color: isIncome ? "var(--income)" : tx.color }
                    : undefined
                }
              >
                {formatAmount(tx.amount)}
              </p>
              <p className="mt-0.5 flex items-center justify-end gap-1 text-xs text-muted-foreground">
                {isIncome ? (
                  <ArrowDownLeft className="size-3" />
                ) : (
                  <ArrowUpRight className="size-3" />
                )}
                {tx.date}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
