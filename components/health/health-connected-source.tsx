import type { DomainConnection } from "@/lib/sync-connections";
import { CONNECTION_EMPTY_COPY } from "@/lib/sync-connections";
import { ConnectionEmptyState, SourceIndicator } from "@/components/sync";

type HealthConnectedSourceProps = {
  connection: DomainConnection;
  showEmpty?: boolean;
};

export function HealthConnectedSource({
  connection,
  showEmpty = false,
}: HealthConnectedSourceProps) {
  const connected = connection.status === "connected";
  const emptyCopy = CONNECTION_EMPTY_COPY.health;

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
    <footer className="sync-health-source-footer">
      <SourceIndicator
        label={
          connected
            ? `${connection.sourceLabel} connected`
            : connection.sourceLabel
        }
      />
    </footer>
  );
}
