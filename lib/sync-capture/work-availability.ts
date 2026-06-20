export type WorkAvailability = "off" | "overtime";

export function isWorkDayOffLanguage(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;

  if (/\b(overtime|extra shift|worked overtime)\b/.test(normalized)) {
    return false;
  }

  return (
    /\b(don'?t|do not|won'?t|will not|not)\s+work\b/.test(normalized) ||
    /\b(day off|off day|taking off|take off|time off|no work)\b/.test(
      normalized,
    ) ||
    /\b(i'?m|i am)\s+off\b/.test(normalized) ||
    /\boff\s+(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next)\b/.test(
      normalized,
    ) ||
    /\b(cancel|skip)\s+work\b/.test(normalized)
  );
}

export function isWorkOvertimeLanguage(text: string): boolean {
  return /\b(overtime|extra shift|worked overtime|working late)\b/i.test(text);
}

export function detectWorkAvailability(text: string): WorkAvailability | undefined {
  if (isWorkDayOffLanguage(text)) return "off";
  if (isWorkOvertimeLanguage(text)) return "overtime";
  return undefined;
}

export function isWorkDayOffItem(item: {
  workAvailability?: WorkAvailability;
  title: string;
  prompt: string;
  originalPrompt?: string;
}) {
  if (item.workAvailability === "off") return true;
  const text = `${item.title} ${item.originalPrompt ?? item.prompt}`;
  return isWorkDayOffLanguage(text);
}
