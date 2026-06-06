import Link from "next/link";

import type { DomainConnection } from "@/lib/sync-connections";
import { CONNECTION_EMPTY_COPY } from "@/lib/sync-connections";
import {
  ConnectionEmptyState,
  SourceIndicator,
} from "@/components/sync";

type HomeGoal = {
  id: string;
  label: string;
  note: string;
  href: string;
};

type HomeSideStackProps = {
  goals: HomeGoal[];
  moneyLabel: string;
  healthLabel: string;
  money: DomainConnection;
  health: DomainConnection;
  goalsConnection: DomainConnection;
};

export function HomeSideStack({
  goals,
  moneyLabel,
  healthLabel,
  money,
  health,
  goalsConnection,
}: HomeSideStackProps) {
  const moneyActive = money.status === "connected";
  const healthActive = health.status === "connected";
  const moneyEmpty = CONNECTION_EMPTY_COPY.money;
  const healthEmpty = CONNECTION_EMPTY_COPY.health;

  return (
    <aside className="sync-home-side-stack">
      <section className="sync-home-surface sync-home-side-card">
        <header className="flex items-start justify-between gap-3">
          <h2 className="text-[13px] font-medium tracking-[-0.02em] text-foreground/88">
            Goals
          </h2>
          <SourceIndicator label={goalsConnection.sourceLabel} />
        </header>
        <ul className="mt-3.5 flex flex-col gap-3.5">
          {goals.map((goal) => (
            <li key={goal.id}>
              <Link
                href={goal.href}
                className="group block rounded-md transition-colors"
              >
                <p className="text-[12px] font-medium text-foreground/85">
                  {goal.label}
                </p>
                <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground/72 transition-colors group-hover:text-muted-foreground/82">
                  {goal.note}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="sync-home-surface sync-home-side-card">
        <header className="flex items-start justify-between gap-3">
          <h2 className="text-[13px] font-medium tracking-[-0.02em] text-foreground/88">
            Finance
          </h2>
          <SourceIndicator label={money.sourceLabel} />
        </header>
        {moneyActive ? (
          <Link
            href="/finance"
            className="group mt-3 block transition-colors"
          >
            <p className="text-[12px] leading-relaxed text-muted-foreground/74 transition-colors group-hover:text-muted-foreground/85">
              {moneyLabel}
            </p>
          </Link>
        ) : (
          <div className="mt-3">
            <ConnectionEmptyState
              message={moneyEmpty.message}
              actionLabel={moneyEmpty.actionLabel}
              href={moneyEmpty.href}
            />
          </div>
        )}
      </section>

      <section className="sync-home-surface sync-home-side-card">
        <header className="flex items-start justify-between gap-3">
          <h2 className="text-[13px] font-medium tracking-[-0.02em] text-foreground/88">
            Health
          </h2>
          <SourceIndicator label={health.sourceLabel} />
        </header>
        {healthActive ? (
          <Link
            href="/fitness"
            className="group mt-3 block transition-colors"
          >
            <p className="text-[12px] leading-relaxed text-muted-foreground/74 transition-colors group-hover:text-muted-foreground/85">
              {healthLabel}
            </p>
          </Link>
        ) : (
          <div className="mt-3">
            <ConnectionEmptyState
              message={healthEmpty.message}
              actionLabel={healthEmpty.actionLabel}
              href={healthEmpty.href}
            />
          </div>
        )}
      </section>
    </aside>
  );
}
