import { CONNECTION_EMPTY_COPY } from "@/lib/sync-connections";
import {
  EXPANDABLE_LIFE_AREA_IDS,
  isLifeAreaInPrimary,
  mockLifeAreaEnabled,
  type ExpandableLifeAreaId,
} from "@/lib/user-life-areas";
import { ConnectButton } from "@/components/sync";

const AREA_ENABLE_COPY: Record<
  ExpandableLifeAreaId,
  { label: string; hint: string; connectHref: string; connectLabel: string }
> = {
  finance: {
    label: "Finance",
    hint: "Keep your accounts where they are. Connect a bank or card and Sync will read what matters.",
    connectHref: CONNECTION_EMPTY_COPY.money.href,
    connectLabel: CONNECTION_EMPTY_COPY.money.actionLabel,
  },
  health: {
    label: "Health",
    hint: "Keep Apple Health or your tracker. Connect it for sleep, movement, and recovery signals.",
    connectHref: CONNECTION_EMPTY_COPY.health.href,
    connectLabel: CONNECTION_EMPTY_COPY.health.actionLabel,
  },
  work: {
    label: "Work",
    hint: "Connect a work calendar, email, or project tool when you are ready.",
    connectHref: "/settings#area-work",
    connectLabel: "Enable Work",
  },
  school: {
    label: "School",
    hint: "Connect an academic calendar or LMS when classes matter to your week.",
    connectHref: "/settings#area-school",
    connectLabel: "Enable School",
  },
  goals: {
    label: "Goals",
    hint: "Add what you are working toward. Sync will fold momentum into your briefing.",
    connectHref: "/settings#area-goals",
    connectLabel: "Enable Goals",
  },
};

export function SettingsConnections() {
  return (
    <div className="flex flex-col gap-8">
      <section id="connections" className="scroll-mt-6">
        <h2 className="text-[13px] font-medium tracking-[-0.02em] text-foreground/88">
          Connected tools
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground/78">
          Sync reads signals from the apps you trust. Connect more when you are
          ready — active areas move into your sidebar automatically.
        </p>

        <ul className="mt-5 flex flex-col gap-3">
          {(
            Object.keys(CONNECTION_EMPTY_COPY) as Array<
              keyof typeof CONNECTION_EMPTY_COPY
            >
          ).map((key) => {
            const copy = CONNECTION_EMPTY_COPY[key];
            const label =
              key === "money" ? "Finance" : key === "health" ? "Health" : "Calendar";

            return (
              <li
                key={key}
                className="flex flex-col gap-2 rounded-2xl border border-border/30 px-4 py-3.5 sm:px-5"
              >
                <p className="text-[13px] font-medium text-foreground/88">
                  {label}
                </p>
                <p className="text-[12px] leading-relaxed text-muted-foreground/72">
                  {copy.message}
                </p>
                <ConnectButton href={copy.href} className="mt-1 w-fit">
                  {copy.actionLabel}
                </ConnectButton>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="text-[13px] font-medium tracking-[-0.02em] text-foreground/88">
          Life areas
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground/78">
          Enable or connect an area to add it to your primary navigation.
          Inactive areas stay discoverable under Optional Areas in the sidebar.
        </p>

        <ul className="mt-5 flex flex-col gap-3">
          {EXPANDABLE_LIFE_AREA_IDS.map((areaId) => {
            const area = AREA_ENABLE_COPY[areaId];
            const enabled = mockLifeAreaEnabled[areaId];
            const state = { enabled, connected: false };
            const inPrimary = isLifeAreaInPrimary(state);

            return (
              <li
                key={areaId}
                id={`area-${areaId}`}
                className="scroll-mt-6 flex flex-col gap-2 rounded-2xl border border-border/30 px-4 py-3.5 sm:px-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground/88">
                      {area.label}
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground/72">
                      {area.hint}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground/62">
                    {inPrimary ? "Active" : "Optional"}
                  </span>
                </div>
                {!inPrimary && (
                  <ConnectButton href={area.connectHref} className="w-fit">
                    {area.connectLabel}
                  </ConnectButton>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
