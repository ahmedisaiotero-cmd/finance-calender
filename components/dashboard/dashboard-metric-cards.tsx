"use client";

import Link from "next/link";

type MoneyMetricProps = {
  spent: number;
  budget: number;
  monthLabel: string;
};

type HealthMetricProps = {
  activeDays: number;
  goalDays: number;
  minutes: number;
  label: string;
};

type CareerMetricProps = {
  tasksDue: number;
  label: string;
  nextUp: string;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function MoneyMetricCard({ spent, budget, monthLabel }: MoneyMetricProps) {
  const progress = Math.min(Math.round((spent / budget) * 100), 100);

  return (
    <section>
      <h2 className="mb-4 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/65">
        Money
      </h2>
      <p className="text-[15px] font-medium tabular-nums tracking-[-0.02em] text-foreground/85">
        {formatMoney(spent)}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground/55">
        spent this month · {monthLabel}
      </p>
      <div
        className="mt-3 h-px overflow-hidden rounded-full bg-border/50"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-income/60"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] tabular-nums text-muted-foreground/45">
        {formatMoney(budget)} budget
      </p>
      <Link
        href="/money"
        className="mt-3 inline-block text-[11px] text-muted-foreground/55 transition-colors hover:text-muted-foreground/80"
      >
        Open Money
      </Link>
    </section>
  );
}

export function HealthMetricCard({
  activeDays,
  goalDays,
  minutes,
  label,
}: HealthMetricProps) {
  return (
    <section>
      <h2 className="mb-4 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/65">
        Health
      </h2>
      <p className="text-[15px] font-medium tabular-nums tracking-[-0.02em] text-foreground/85">
        {activeDays}/{goalDays}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground/55">
        activities {label.toLowerCase()} · {minutes} min active
      </p>
      <Link
        href="/fitness"
        className="mt-3 inline-block text-[11px] text-muted-foreground/55 transition-colors hover:text-muted-foreground/80"
      >
        Open Health
      </Link>
    </section>
  );
}

export function CareerMetricCard({
  tasksDue,
  label,
  nextUp,
}: CareerMetricProps) {
  return (
    <section>
      <h2 className="mb-4 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/65">
        Career
      </h2>
      <p className="text-[15px] font-medium tabular-nums tracking-[-0.02em] text-foreground/85">
        {tasksDue}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground/55">
        focus areas · {label} · {nextUp}
      </p>
      <Link
        href="/calendar"
        className="mt-3 inline-block text-[11px] text-muted-foreground/55 transition-colors hover:text-muted-foreground/80"
      >
        View timeline
      </Link>
    </section>
  );
}
