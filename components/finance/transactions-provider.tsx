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
  addTransaction: (input: Omit<Transaction, "id">) => void;
  ready: boolean;
};

const TransactionsContext = createContext<TransactionsContextValue | null>(
  null,
);

export function TransactionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setTransactions(stored ? JSON.parse(stored) : recentTransactions);
    } catch {
      setTransactions(recentTransactions);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }, [transactions, ready]);

  const addTransaction = useCallback((input: Omit<Transaction, "id">) => {
    setTransactions((prev) => [{ ...input, id: crypto.randomUUID() }, ...prev]);
  }, []);

  return (
    <TransactionsContext.Provider
      value={{ transactions, addTransaction, ready }}
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
