"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export type UtilityNavItem = {
  label: string;
  href: string;
  isActive: (pathname: string, hash: string) => boolean;
};

export const utilityNavItems: UtilityNavItem[] = [
  {
    label: "Settings",
    href: "/settings",
    isActive: (pathname, hash) =>
      pathname === "/settings" && hash !== "#connections",
  },
  {
    label: "Connections",
    href: "/settings#connections",
    isActive: (pathname, hash) =>
      pathname === "/settings" && hash === "#connections",
  },
];

export function useUtilityNavHash() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  return { pathname, hash };
}

export function isUtilityNavItemActive(
  item: UtilityNavItem,
  pathname: string,
  hash: string,
) {
  return item.isActive(pathname, hash);
}
