import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

type CalendarToolbarProps = {
  monthLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
};

export function CalendarToolbar({
  monthLabel,
  onPrevious,
  onNext,
  onToday,
}: CalendarToolbarProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{monthLabel}</h2>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onToday}
          className="rounded-full"
        >
          Today
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={onPrevious}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={onNext}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
