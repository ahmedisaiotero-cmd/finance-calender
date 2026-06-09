import type { CalendarLens } from "@/lib/timeline-events";

const MESSAGES: Record<
  Exclude<CalendarLens, "all" | "money" | "health">,
  { title: string; body: string }
> = {
  family: {
    title: "Family",
    body: "Family plans and shared moments will live on your Sync timeline.",
  },
  goals: {
    title: "Goals",
    body: "Goals and milestones will stay visible without turning life into a scoreboard.",
  },
  reflection: {
    title: "Reflection",
    body: "Notes, moods, and reflections will have a calm place on your timeline.",
  },
  work: {
    title: "Work",
    body: "Shifts, focus blocks, and work plans will show up here.",
  },
  career: {
    title: "Career",
    body: "Deadlines, shifts, and focus blocks will live on your SYNC timeline.",
  },
  relationships: {
    title: "Relationships",
    body: "Plans and moments with people you care about will show up here.",
  },
  personal: {
    title: "Personal",
    body: "Habits and goals just for you will sync to this calendar.",
  },
};

type CalendarLensEmptyProps = {
  lens: Exclude<CalendarLens, "all" | "money" | "health">;
};

export function CalendarLensEmpty({ lens }: CalendarLensEmptyProps) {
  const copy = MESSAGES[lens];

  return (
    <div className="py-12 text-center">
      <p className="text-[13px] font-medium tracking-[-0.01em] text-foreground/80">
        {copy.title}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-[12px] text-muted-foreground/55">
        {copy.body}
      </p>
      <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/45">
        Coming soon
      </p>
    </div>
  );
}
