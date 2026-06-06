import type { DomainConnection } from "@/lib/sync-connections";
import { CONNECTION_EMPTY_COPY } from "@/lib/sync-connections";
import { ConnectionEmptyState } from "@/components/sync";

type FinanceConnectedSourcesProps = {
  connection: DomainConnection;
  institutions: string[];
  lastUpdatedMinutes: number;
  showEmpty?: boolean;
};

export function FinanceConnectedSources({
  connection,
  institutions,
  showEmpty = false,
}: FinanceConnectedSourcesProps) {
  const connected = connection.status === "connected";
  const emptyCopy = CONNECTION_EMPTY_COPY.money;

  if (showEmpty && !connected) {
    return (
      <section className="sync-home-surface">
        <ConnectionEmptyState
          message={emptyCopy.message}
          actionLabel={emptyCopy.actionLabel}
          href={emptyCopy.href}
        />
      </section>
    );
  }

  return (
    <footer className="sync-finance-source-footer">
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground/58">
        via {institutions.slice(0, 2).join(" · ")}
      </p>
    </footer>
  );
}
