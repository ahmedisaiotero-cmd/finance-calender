"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

type SyncLogoMarkProps = {
  className?: string;
};

/** Abstract sync loops + four signal dots — Base44-inspired pastel strokes */
export function SyncLogoMark({ className }: SyncLogoMarkProps) {
  const uid = useId().replace(/:/g, "");
  const loopA = `sync-loop-a-${uid}`;
  const loopB = `sync-loop-b-${uid}`;
  const glow = `sync-glow-${uid}`;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-full", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={loopA} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id={loopB} x1="20" y1="4" x2="4" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fb923c" />
          <stop offset="1" stopColor="#f472b6" />
        </linearGradient>
        <radialGradient id={glow} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12 12) scale(9)">
          <stop stopColor="#c4b5fd" stopOpacity="0.45" />
          <stop offset="0.55" stopColor="#fde68a" stopOpacity="0.2" />
          <stop offset="1" stopColor="#faf9f7" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="12" cy="12" r="9" fill={`url(#${glow})`} />

      <path
        d="M12 5.5c3.6 0 6.5 2.7 6.5 6 0 1.2-.35 2.3-1 3.2"
        stroke={`url(#${loopA})`}
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <path
        d="M16.8 15.2 14.2 12.6"
        stroke={`url(#${loopA})`}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M12 18.5c-3.6 0-6.5-2.7-6.5-6 0-1.2.35-2.3 1-3.2"
        stroke={`url(#${loopB})`}
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <path
        d="M7.2 8.8 9.8 11.4"
        stroke={`url(#${loopB})`}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx="12" cy="12" r="2.25" fill="#faf9f7" stroke="oklch(0.205 0 0 / 0.12)" strokeWidth="0.75" />

      <circle cx="6.25" cy="6.25" r="1.1" fill="#a3e635" />
      <circle cx="17.75" cy="6.25" r="1.1" fill="#fb923c" />
      <circle cx="6.25" cy="17.75" r="1.1" fill="#fb923c" fillOpacity="0.55" />
      <circle cx="17.75" cy="17.75" r="1.1" fill="#a3e635" fillOpacity="0.55" />
    </svg>
  );
}
