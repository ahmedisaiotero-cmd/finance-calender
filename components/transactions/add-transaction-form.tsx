"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { TRANSACTION_CATEGORIES } from "@/lib/transaction-utils";
import type { Transaction } from "@/src/data/transactions";
import { cn } from "@/lib/utils";

type AddTransactionFormProps = {
  onAdd: (transaction: Omit<Transaction, "id">) => void;
};

export function AddTransactionForm({ onAdd }: AddTransactionFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(TRANSACTION_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const value = parseFloat(amount);
    if (!name.trim() || Number.isNaN(value) || value <= 0) return;

    onAdd({
      name: name.trim(),
      category: type === "income" ? "Income" : category,
      amount: type === "income" ? value : -value,
      date,
      dateISO: date,
    });

    setName("");
    setAmount("");
    setDate(new Date().toISOString().slice(0, 10));
    setOpen(false);
  }

  return (
    <SurfaceCard className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Add transaction
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Saved in your browser automatically.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="rounded-full"
          onClick={() => setOpen((prev) => !prev)}
        >
          <Plus className="size-4" />
          {open ? "Close" : "New"}
        </Button>
      </div>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="mt-5 grid gap-4 border-t border-border/60 pt-5 sm:grid-cols-2"
        >
          <Field label="Name">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Coffee shop"
              className={inputClass}
            />
          </Field>

          <Field label="Date">
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Type">
            <div className="flex gap-2">
              {(["expense", "income"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setType(option)}
                  className={cn(
                    "flex-1 rounded-xl px-3 py-2 text-sm font-medium capitalize transition-colors",
                    type === option
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Amount">
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </Field>

          {type === "expense" && (
            <Field label="Category" className="sm:col-span-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                {TRANSACTION_CATEGORIES.filter((c) => c !== "Income").map(
                  (item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ),
                )}
              </select>
            </Field>
          )}

          <div className="sm:col-span-2">
            <Button type="submit" className="w-full rounded-full sm:w-auto">
              Save transaction
            </Button>
          </div>
        </form>
      )}
    </SurfaceCard>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30";
