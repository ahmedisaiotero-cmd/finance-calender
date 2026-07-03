export type TrivialInputDetection = {
  detected: boolean;
  reason: string;
};

const TRIVIAL_PATTERNS = [
  /\b(i )?(saw|seen) (a|the) (red )?car\b/i,
  /\b(i )?(watched|saw) (a )?(random )?video\b/i,
  /\b(i )?(ate|had) (a )?(cereal|sandwich|soda)\b/i,
  /\b(i )?heard (a|the) dog bark\b/i,
  /\b(i )?bought (a|some) soda\b/i,
  /\b(i )?(brushed|brush(?:ed)?) (my )?teeth\b/i,
  /\b(i )?(drank|had) (my )?coffee\b/i,
];

export function detectTrivialInput(text: string): TrivialInputDetection {
  const normalized = text.trim();
  if (!normalized) return { detected: false, reason: "Input is empty." };

  for (const pattern of TRIVIAL_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        detected: true,
        reason: "Low-value observation without future decision impact.",
      };
    }
  }

  return {
    detected: false,
    reason: "Input has potential decision value.",
  };
}
