"use client";

import { useEffect, useState } from "react";

import { userProfile } from "@/lib/mock-data";

type SyncUser = {
  name: string;
  email: string;
  source: "mock" | "database";
};

export function useSyncUser() {
  const [user, setUser] = useState<SyncUser>({
    name: userProfile.name,
    email: userProfile.email,
    source: "mock",
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/user");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setUser({
              name: data.name ?? userProfile.name,
              email: data.email ?? userProfile.email,
              source: data.source === "database" ? "database" : "mock",
            });
          }
        }
      } catch {
        // keep mock defaults
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, ready };
}
