import type { CapturedSyncItem } from "@/lib/captured-items";
import type { PulsePlan } from "@/lib/pulse/types";

function hasYearlyMemoryLanguage(value: string) {
  return /\b(birthday|anniversary|yearly|annual|annually)\b/i.test(value);
}

export function getSyncReliefMessage(
  plan: PulsePlan,
  capturedItem: CapturedSyncItem,
): string {
  const promptText = `${plan.prompt} ${capturedItem.prompt}`;

  if (
    plan.parsedInput?.frequency === "yearly" ||
    hasYearlyMemoryLanguage(promptText)
  ) {
    return "I'll remember this when it comes around again.";
  }

  if (plan.parsedInput?.moneyType === "income" || capturedItem.moneyType === "income") {
    return "I'll keep track of this incoming money.";
  }

  if (plan.category === "expense") {
    return "Tracked. You don't have to keep this in your head.";
  }

  if (plan.category === "subscription") {
    return "I'll keep track of this recurring charge.";
  }

  if (plan.category === "reminder") {
    return "You're all set. I'll remind you when it matters.";
  }

  if (
    plan.category === "workout" ||
    capturedItem.destinations.includes("Health")
  ) {
    return "Small steps count. I'll keep this with your health.";
  }

  if (plan.category === "savings-goal" || capturedItem.destinations.includes("Goals")) {
    return "I'll help you keep up with this.";
  }

  if (plan.category === "workday" || capturedItem.destinations.includes("Calendar")) {
    return "I'll keep this on your rhythm.";
  }

  return "You're all set. I'll remember that.";
}
