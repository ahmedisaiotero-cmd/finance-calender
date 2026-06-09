import { PulseOrganizer } from "@/components/pulse/pulse-organizer";

export function SyncDashboard() {
  return (
    <div
      className="sync-home sync-home--capture min-h-[calc(100vh-7rem)] items-center justify-center"
      data-page="home"
    >
      <header className="sync-home-hero flex w-full max-w-2xl flex-col items-center text-center">
        <h1 className="text-[2.35rem] font-medium leading-none tracking-[-0.055em] text-foreground/95 sm:text-[3rem]">
          SYNC
        </h1>
        <p className="mt-3 text-[13px] font-medium tracking-[-0.01em] text-muted-foreground/62">
          Stay in Sync.
        </p>
      </header>

      <PulseOrganizer />
    </div>
  );
}
