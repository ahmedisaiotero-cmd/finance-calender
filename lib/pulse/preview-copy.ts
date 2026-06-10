import type { PulsePlan } from "@/lib/pulse/types";

function hasYearlyMemoryLanguage(value: string) {
  return /\b(birthday|anniversary|yearly|annual|annually)\b/i.test(value);
}

export function getSyncPreviewThought(plan: PulsePlan): string {
  if (
    plan.parsedInput?.frequency === "yearly" ||
    hasYearlyMemoryLanguage(plan.prompt)
  ) {
    return "This sounds worth remembering.";
  }

  if (plan.parsedInput?.moneyType === "income") {
    return "I'll keep track of this incoming money.";
  }
  if (plan.category === "expense") return "I can track this for you.";
  if (plan.category === "subscription") return "This looks recurring.";
  if (plan.category === "reminder") return "I can help you remember this.";
  if (plan.category === "workout") return "I can keep this with your health.";
  if (plan.category === "savings-goal") return "I can help you keep up with this.";
  if (plan.category === "workday") return "This sounds like part of your rhythm.";

  return "I can keep this organized.";
}
