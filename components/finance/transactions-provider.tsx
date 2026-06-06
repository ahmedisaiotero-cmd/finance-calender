"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { recentTransactions, type Transaction } from "@/src/data/transactions";

const STORAGE_KEY = "finance-calendar-transactions";

type TransactionsContextValue = {
  transactions: Transaction[];
  addTransaction: (input: Omit<Transaction, "id">) => Promise<void>;
  ready: boolean;
  usingDatabase: boolean;
};

const TransactionsContext = createContext<TransactionsContextValue | null>(
  null,
);

async function fetchTransactionsFromApi(): Promise<Transaction[] | null> {
  try {
    const res = await fetch("/api/transactions");
    if (!res.ok) return null;
    const data = await res.json();
    return data.transactions as Transaction[];
  } catch {
    return null;
  }
}

export function TransactionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ready, setReady] = useState(false);
  const [usingDatabase, setUsingDatabase] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const fromApi = await fetchTransactionsFromApi();

      if (cancelled) return;

      if (fromApi) {
        setTransactions(fromApi);
        setUsingDatabase(true);
        setReady(true);
        return;
      }

      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        setTransactions(stored ? JSON.parse(stored) : recentTransactions);
      } catch {
        setTransactions(recentTransactions);
      }
      setUsingDatabase(false);
      setReady(true);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || usingDatabase) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }, [transactions, ready, usingDatabase]);

  const addTransaction = useCallback(
    async (input: Omit<Transaction, "id">) => {
      if (usingDatabase) {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: input.name,
            category: input.category,
            amount: input.amount,
            dateISO: input.dateISO ?? input.date,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to save transaction");
        }

        const data = await res.json();
        setTransactions((prev) => [data.transaction as Transaction, ...prev]);
        return;
      }

      setTransactions((prev) => [
        { ...input, id: crypto.randomUUID() },
        ...prev,
      ]);
    },
    [usingDatabase],
  );

  return (
    <TransactionsContext.Provider
      value={{ transactions, addTransaction, ready, usingDatabase }}
    >
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionsContext);
  if (!ctx) {
    throw new Error("useTransactions must be used within TransactionsProvider");
  }
  return ctx;
}
