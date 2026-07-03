import Link from "next/link";
import { CalendarDays, Dumbbell, Wallet } from "lucide-react";

const LIFE_SURFACES = [
  {
    href: "/calendar",
    label: "Calendar",
    description: "When are the important moments?",
    icon: CalendarDays,
  },
  {
    href: "/finance",
    label: "Money",
    description: "Am I financially on track?",
    icon: Wallet,
  },
  {
    href: "/health",
    label: "Health",
    description: "Am I taking care of myself?",
    icon: Dumbbell,
  },
] as const;

export default function LifePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Life</h1>
        <p className="text-muted-foreground">
          Deeper views when you want them — your briefing stays the front door.
        </p>
      </header>

      <div className="grid gap-4">
        {LIFE_SURFACES.map((surface) => {
          const Icon = surface.icon;
          return (
            <Link
              key={surface.href}
              href={surface.href}
              className="group rounded-2xl border border-border/40 bg-card/40 p-5 transition-colors hover:border-primary/25 hover:bg-primary/5"
            >
              <div className="flex items-start gap-4">
                <span className="flex size-10 items-center justify-center rounded-xl bg-muted/30 text-muted-foreground group-hover:text-foreground">
                  <Icon className="size-5" strokeWidth={1.8} />
                </span>
                <div>
                  <p className="text-lg font-medium">{surface.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {surface.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground">
        Work, family, school, and goals stay tucked away until they earn a place
        in your routine.{" "}
        <Link href="/settings" className="text-primary underline-offset-2 hover:underline">
          Settings
        </Link>
      </p>
    </div>
  );
}
