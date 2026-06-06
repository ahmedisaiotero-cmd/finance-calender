import type { HomeConnections, LifeDomain } from "@/lib/sync-connections";
import { cn } from "@/lib/utils";

type ConnectedLifeStripProps = {
  connections: HomeConnections;
  className?: string;
};

const DOMAIN_ORDER: { key: LifeDomain; label: string }[] = [
  { key: "calendar", label: "Calendar" },
  { key: "money", label: "Finance" },
  { key: "health", label: "Health" },
  { key: "goals", label: "Goals" },
];

function statusWord(status: HomeConnections[LifeDomain]["status"]): string {
  if (status === "manual") return "manual";
  if (status === "connected") return "connected";
  if (status === "pending") return "pending";
  return "not connected";
}

export function ConnectedLifeStrip({
  connections,
  className,
}: ConnectedLifeStripProps) {
  return (
    <div
      className={cn("sync-connected-life", className)}
      aria-label="Connected life status"
    >
      <p className="sync-connected-life-label">Connected Life</p>
      <ul className="sync-connected-life-pills">
        {DOMAIN_ORDER.map(({ key, label }) => {
          const connection = connections[key];
          const status = statusWord(connection.status);

          return (
            <li key={key}>
              <span
                className={cn(
                  "sync-connected-life-pill",
                  status === "connected" && "sync-connected-life-pill--on",
                  status === "pending" && "sync-connected-life-pill--pending",
                  status === "manual" && "sync-connected-life-pill--manual",
                )}
              >
                <span className="sync-connected-life-pill-domain">{label}</span>
                <span className="sync-connected-life-pill-status">{status}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
