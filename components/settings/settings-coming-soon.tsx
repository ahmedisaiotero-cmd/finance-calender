import { SYNC_CATEGORY_SOON_LABEL } from "@/lib/sync-copy";
import { COMING_SOON_AREAS } from "@/lib/coming-soon-areas";

export function SettingsComingSoon() {
  return (
    <section id="coming-soon" className="scroll-mt-6">
      <h2 className="text-[13px] font-medium tracking-[-0.02em] text-foreground/88">
        Coming Soon
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground/78">
        Life areas on the horizon. Sync will grow with you — these stay out of
        the sidebar until they are ready.
      </p>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {COMING_SOON_AREAS.map((area) => {
          const Icon = area.icon;
          return (
            <li
              key={area.id}
              className="flex gap-3 rounded-2xl border border-border/25 px-4 py-3.5 sm:px-4"
            >
              <Icon
                className="mt-0.5 size-4 shrink-0 text-muted-foreground/45"
                strokeWidth={1.75}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-medium text-foreground/85">
                    {area.label}
                  </p>
                  <span className="rounded-full border border-border/35 px-1.5 py-px text-[9px] font-medium tracking-wide text-muted-foreground/55">
                    {SYNC_CATEGORY_SOON_LABEL}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/68">
                  {area.description}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
