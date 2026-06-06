import type { CalendarLens } from "@/lib/timeline-events";

const MESSAGES: Record<
  Exclude<CalendarLens, "all" | "money" | "health">,
  { title: string; body: string }
> = {
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
    <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center">
      <p className="text-sm font-semibold tracking-tight">{copy.title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        {copy.body}
      </p>
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Coming soon
      </p>
    </div>
  );
}
