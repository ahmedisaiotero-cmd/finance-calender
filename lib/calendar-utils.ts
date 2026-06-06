export function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function getMonthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export type CalendarCell = {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
};

export function getTwoWeekCells(reference = new Date()): CalendarCell[] {
  const todayKey = toDateKey(new Date());
  const anchor = new Date(reference);
  anchor.setHours(12, 0, 0, 0);
  const weekStart = new Date(anchor);
  weekStart.setDate(anchor.getDate() - anchor.getDay());

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 14; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dateKey = toDateKey(date);
    cells.push({
      date,
      dateKey,
      isCurrentMonth: true,
      isToday: dateKey === todayKey,
    });
  }
  return cells;
}

export function getTwoWeekRangeLabel(cells: CalendarCell[]) {
  if (cells.length === 0) return "";
  const first = cells[0].date;
  const last = cells[cells.length - 1].date;
  const sameMonth = first.getMonth() === last.getMonth();
  const sameYear = first.getFullYear() === last.getFullYear();

  if (sameMonth && sameYear) {
    return `${first.toLocaleDateString("en-US", { month: "long" })} ${first.getDate()} – ${last.getDate()}, ${last.getFullYear()}`;
  }

  const start = first.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const end = last.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${start} – ${end}`;
}

export function getUniqueMonthsFromCells(cells: CalendarCell[]) {
  const seen = new Set<string>();
  const months: { year: number; month: number }[] = [];

  for (const cell of cells) {
    const key = `${cell.date.getFullYear()}-${cell.date.getMonth()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    months.push({ year: cell.date.getFullYear(), month: cell.date.getMonth() });
  }

  return months;
}

export function getCalendarCells(year: number, month: number): CalendarCell[] {
  const todayKey = toDateKey(new Date());
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i,
    );
    const dateKey = toDateKey(date);
    cells.push({
      date,
      dateKey,
      isCurrentMonth: date.getMonth() === month,
      isToday: dateKey === todayKey,
    });
  }
  return cells;
}

export function groupEventsByDate<T extends { date: string }>(events: T[]) {
  const map = new Map<string, T[]>();
  for (const event of events) {
    const list = map.get(event.date) ?? [];
    list.push(event);
    map.set(event.date, list);
  }
  return map;
}

export function formatCurrency(amount: number) {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.abs(amount));
  return amount >= 0 ? `+${formatted}` : `−${formatted}`;
}
