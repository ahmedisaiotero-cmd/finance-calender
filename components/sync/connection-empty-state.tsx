import { ConnectButton } from "@/components/sync/connect-button";

type ConnectionEmptyStateProps = {
  message: string;
  actionLabel: string;
  href: string;
};

export function ConnectionEmptyState({
  message,
  actionLabel,
  href,
}: ConnectionEmptyStateProps) {
  return (
    <div className="sync-home-connection-empty">
      <p className="max-w-sm text-[12px] leading-relaxed text-muted-foreground/72">
        {message}
      </p>
      <ConnectButton href={href} className="mt-3.5">
        {actionLabel}
      </ConnectButton>
    </div>
  );
}
