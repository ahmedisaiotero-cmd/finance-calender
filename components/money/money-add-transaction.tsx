"use client";

import { useState } from "react";

import { TRANSACTION_CATEGORIES } from "@/lib/transaction-utils";
import type { Transaction } from "@/src/data/transactions";
import { cn } from "@/lib/utils";

type MoneyAddTransactionProps = {
  onAdd: (transaction: Omit<Transaction, "id">) => void | Promise<void>;
};

export function MoneyAddTransaction({ onAdd }: MoneyAddTransactionProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(TRANSACTION_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const value = parseFloat(amount);
    if (!name.trim() || Number.isNaN(value) || value <= 0) return;

    await onAdd({
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
    <section>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="text-[11px] text-muted-foreground/55 transition-colors hover:text-muted-foreground/80"
      >
        {open ? "Cancel" : "+ Add transaction"}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className={inputClass}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className={inputClass}
            />
          </div>
          <div className="flex gap-3 text-[11px]">
            {(["expense", "income"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setType(option)}
                className={cn(
                  "capitalize transition-colors",
                  type === option
                    ? "text-foreground/85"
                    : "text-muted-foreground/45",
                )}
              >
                {option}
              </button>
            ))}
          </div>
          {type === "expense" && (
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
          )}
          <button
            type="submit"
            className="self-start text-[11px] text-foreground/75 transition-colors hover:text-foreground"
          >
            Save
          </button>
        </form>
      )}
    </section>
  );
}

const inputClass =
  "w-full border-0 border-b border-border/40 bg-transparent py-1.5 text-[12px] outline-none placeholder:text-muted-foreground/45 focus:border-border/70";
