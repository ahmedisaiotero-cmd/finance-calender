export type PulseOutput = {
  headline: string
  summary: string
  today: string[]
  nextStep: string
  tone: "good" | "neutral" | "attention"
}

export function generatePulse(): PulseOutput {
  return {
    headline: "Your day is taking shape",
    summary: "Sync is starting to understand what matters across your life.",
    today: [
      "Review your calendar",
      "Check your finance rhythm",
      "Keep one health routine alive",
    ],
    nextStep: "Choose one thing that would make today feel successful.",
    tone: "neutral",
  }
}
