import type { CapturedSyncItem } from "@/lib/captured-items";
import type { SyncImportance } from "@/lib/intelligence/importance-scoring";
import { scoreImportance } from "@/lib/intelligence/importance-scoring";
import { normalizeCaptureInput } from "@/lib/parser/normalize-capture-input";

export type MemoryWeight = "light" | "important" | "meaningful" | "critical";

const WEIGHT_ORDER: Record<MemoryWeight, number> = {
  light: 0,
  important: 1,
  meaningful: 2,
  critical: 3,
};

export function memoryWeightFromImportance(
  importance: SyncImportance,
  text: string,
): MemoryWeight {
  const normalized = text.toLowerCase();

  if (importance === "critical") return "critical";

  if (
    importance === "high" &&
    /\b(flight|emergency|surgery|hospital|rent due|deadline)\b/i.test(normalized)
  ) {
    return "critical";
  }

  if (
    /\b(sad|upset|anxious|stressed|depressed|lonely| cried|crying|feeling low|feeling down)\b/i.test(
      normalized,
    ) ||
    /\b(worried|worry|concerned|nervous|dread|afraid|overwhelmed|tight this month)\b/i.test(
      normalized,
    ) ||
    /\b(sleep was rough|rough night|low energy|exhausted|not feeling well|headache|migraine)\b/i.test(
      normalized,
    ) ||
    /\b(birthday|anniversary|wedding|graduation|milestone|promotion)\b/i.test(
      normalized,
    ) ||
    /\b(daughter|son|mom|dad|mother|father|family|friend|girlfriend|boyfriend|partner)\b/i.test(
      normalized,
    ) ||
    /\b(needing more help|needs more help|need more help|needs support|needing support|care lately)\b/i.test(
      normalized,
    )
  ) {
    if (
      importance === "low" &&
      /\b(sad|upset|anxious|stressed|feeling|worried|worry|concerned|nervous|dread|afraid|overwhelmed|tight this month|sleep was rough|rough night|low energy|exhausted|not feeling well|headache|migraine|needing more help|needs more help|need more help|needs support|needing support|care lately)\b/i.test(
        normalized,
      )
    ) {
      return "meaningful";
    }
    if (importance !== "low") return "meaningful";
  }

  if (
    /\b(i want to|get better at|trying to|goal|working toward|improve|learn to)\b/i.test(
      normalized,
    ) ||
    /\b(i prefer|preference|works better for me|best for me)\b/i.test(normalized) ||
    /\b(idea|thinking about|note to self)\b/i.test(normalized)
  ) {
    return importance === "low" ? "important" : "meaningful";
  }

  if (/\b(daily|lately|usually|routine|habit|most days)\b/i.test(normalized)) {
    return "light";
  }

  if (
    importance === "high" ||
    /\b(payday|pay day|rent|bill due|appointment|doctor|dentist|interview)\b/i.test(
      normalized,
    )
  ) {
    return "important";
  }

  if (
    importance === "low" ||
    /\b(coffee|meal|ate|eating|snack|lunch|breakfast|dinner|shower|spent \$\d+|bought|purchase)\b/i.test(
      normalized,
    )
  ) {
    return "light";
  }

  if (importance === "medium") return "important";
  return "light";
}

export function maxMemoryWeight(a: MemoryWeight, b: MemoryWeight): MemoryWeight {
  return WEIGHT_ORDER[a] >= WEIGHT_ORDER[b] ? a : b;
}

export type MemoryWeightInput = Pick<
  CapturedSyncItem,
  | "title"
  | "prompt"
  | "originalPrompt"
  | "destinations"
  | "timeline"
  | "category"
  | "moneyType"
>;

export function scoreMemoryWeight(
  item: MemoryWeightInput,
  reference = new Date(),
): MemoryWeight {
  const prompt = (item.originalPrompt ?? item.prompt).trim();
  const normalized = normalizeCaptureInput(prompt).normalized;
  const text = `${item.title} ${normalized}`;

  const importance = scoreImportance({
    text,
    title: item.title,
    category: item.category,
    destinations: item.destinations,
    timeline: item.timeline,
    reference,
  });

  return memoryWeightFromImportance(importance, text);
}
