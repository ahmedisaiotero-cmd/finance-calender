"use client";

import { useCallback, useEffect, useState } from "react";

import { recentTransactions, type Transaction } from "@/src/data/transactions";

const STORAGE_KEY = "finance-calendar-transactions";

export function useTransactions() {
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

  const addTransaction = useCallback(
    (input: Omit<Transaction, "id">) => {
      setTransactions((prev) => [
        { ...input, id: crypto.randomUUID() },
        ...prev,
      ]);
    },
    [],
  );

  return { transactions, addTransaction, ready };
}
