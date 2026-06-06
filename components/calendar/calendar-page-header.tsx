import { SYNC_PRODUCT } from "@/lib/sync-copy";

export function CalendarPageHeader() {
  return (
    <header>
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/62">
        {SYNC_PRODUCT.name}
      </p>
      <h1 className="mt-1.5 text-[1.75rem] font-medium tracking-[-0.035em] text-foreground/95 sm:text-[2rem]">
        Calendar
      </h1>
    </header>
  );
}
