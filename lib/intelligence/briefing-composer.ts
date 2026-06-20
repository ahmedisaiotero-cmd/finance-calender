import type { SyncConsequence } from "@/lib/intelligence/sync-consequences";
import {
  assessTomorrowLoad,
  headlineForTomorrowLoad,
} from "@/lib/intelligence/life-load";
import { formatSyncClock } from "@/lib/sync-time-blocks";

export type BriefTimeGroup = "tomorrow" | "this_week" | "later";

export type CuratedBriefSection = {
  id: "noticing";
  label: string;
  paragraphs: string[];
};

const GROUP_LABELS: Record<BriefTimeGroup, string> = {
  tomorrow: "Tomorrow",
  this_week: "This Week",
  later: "Later",
};

const GROUP_ORDER: BriefTimeGroup[] = ["tomorrow", "this_week", "later"];

const MAX_BRIEF_ITEMS = 7;
const MAX_PER_GROUP: Record<BriefTimeGroup, number> = {
  tomorrow: 5,
  this_week: 4,
  later: 2,
};

function normalizeBriefFact(text: string) {
  return text.toLowerCase().replace(/[.!?]/g, "").trim();
}

function briefFactsOverlap(a: string, b: string) {
  const left = normalizeBriefFact(a);
  const right = normalizeBriefFact(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;

  const sharedTopics = [
    "payday",
    "work begins",
    "work starts",
    "birthday",
    "rent",
    "flight",
    "daughter",
    "school",
    "anniversary",
  ];

  return sharedTopics.some(
    (topic) => left.includes(topic) && right.includes(topic),
  );
}

function isVagueConsequence(text: string) {
  const normalized = text.toLowerCase();
  return (
    /worth a (quick )?check/.test(normalized) ||
    /worth a spot/.test(normalized) ||
    /worth noticing/.test(normalized) ||
    /haven't logged exercise/.test(normalized) ||
    /exercise in \d+ days/.test(normalized)
  );
}

function isNoiseConsequence(consequence: SyncConsequence) {
  const text = consequence.surfaceText.toLowerCase();
  if (consequence.kind === "ambient" || consequence.kind === "health_log") {
    return true;
  }
  if (consequence.kind === "day_synthesis") return true;
  if (/early flight tomorrow — tonight/.test(text)) return true;
  if (/affects your morning availability/.test(text)) return true;
  if (/tomorrow stays open unless/.test(text)) return true;
  if (/finance deadline within the week/.test(text)) return true;
  if (/evening opens|open after/.test(text)) return true;
  if (/you work the next/.test(text)) return true;
  if (/tomorrow is open after/.test(text)) return true;
  if (isVagueConsequence(text)) return true;
  return false;
}

function timeGroupForConsequence(
  consequence: SyncConsequence,
): BriefTimeGroup | null {
  const days = consequence.daysUntil;
  if (days == null || days < 0) return null;
  if (days === 0) return null;
  if (days === 1) return "tomorrow";
  if (days <= 7) return "this_week";
  return "later";
}

function profileSortBoost(
  consequence: SyncConsequence,
  priorities: string[],
): number {
  if (priorities.length === 0) return 0;
  const text = consequence.surfaceText.toLowerCase();
  let boost = 0;

  if (
    priorities.includes("Family") &&
    /\b(daughter|son|school|mom|dad|family|birthday)\b/.test(text)
  ) {
    boost -= 6;
  }
  if (
    priorities.includes("Relationships") &&
    /\b(friend|girlfriend|boyfriend|partner|anniversary|birthday)\b/.test(text)
  ) {
    boost -= 6;
  }
  if (
    priorities.includes("Money") &&
    /\b(payday|rent|bill|due|finance)\b/.test(text)
  ) {
    boost -= 6;
  }
  if (
    priorities.includes("Work") &&
    /\b(work|shift|flight|off tomorrow)\b/.test(text)
  ) {
    boost -= 4;
  }
  if (
    priorities.includes("Health") &&
    /\b(gym|workout|doctor|health)\b/.test(text)
  ) {
    boost -= 4;
  }

  return boost;
}

function refineSurfaceText(
  consequence: SyncConsequence,
  busyMorning: boolean,
): string {
  let text = consequence.surfaceText;

  if (/\bfriend(?:'s)? birthday\b/i.test(text) && !/^your friend's/i.test(text)) {
    text = text.replace(
      /friend(?:'s)? birthday is tomorrow/i,
      "Your friend's birthday is tomorrow",
    );
    text = text.replace(
      /friend(?:'s)? birthday is (\w+)/i,
      "Your friend's birthday is $1",
    );
  }

  if (consequence.kind === "work_start" && consequence.daysUntil === 1) {
    const match = text.match(/Work starts? at (.+?)\.?$/i);
    if (match) {
      const time = match[1].trim();
      text = busyMorning
        ? `Work begins at ${time} after a busy morning.`
        : `Work begins at ${time}.`;
    }
  }

  if (/\btake\s+\w+\s+to\s+school\b/i.test(text)) {
    text = text.replace(/\s+at \d{1,2}:\d{2}\s*(AM|PM)/i, "");
    if (!text.endsWith(".")) text = `${text}.`;
  }

  if (!text.endsWith(".")) text = `${text}.`;
  return text;
}

function sortConsequences(
  consequences: SyncConsequence[],
  priorities: string[],
) {
  return [...consequences].sort((a, b) => {
    const profileA = profileSortBoost(a, priorities);
    const profileB = profileSortBoost(b, priorities);
    const dayA = a.daysUntil ?? 99;
    const dayB = b.daysUntil ?? 99;
    if (dayA !== dayB) return dayA - dayB;
    if (a.dateKey && b.dateKey && a.dateKey !== b.dateKey) {
      return a.dateKey.localeCompare(b.dateKey);
    }
    const minuteA = a.sortMinutes ?? 24 * 60;
    const minuteB = b.sortMinutes ?? 24 * 60;
    if (minuteA !== minuteB) return minuteA - minuteB;
    const priorityA = a.priority + profileA;
    const priorityB = b.priority + profileB;
    return priorityA - priorityB;
  });
}

function selectCuratedLines(
  consequences: SyncConsequence[],
  priorities: string[],
  busyMorning: boolean,
  lede: string,
): CuratedBriefSection[] {
  const candidates = sortConsequences(
    consequences.filter(
      (consequence) =>
        consequence.briefEligible &&
        consequence.horizon === "coming_soon" &&
        !isNoiseConsequence(consequence) &&
        timeGroupForConsequence(consequence) != null,
    ),
    priorities,
  );

  const selected: Array<{ group: BriefTimeGroup; text: string }> = [];
  const counts: Record<BriefTimeGroup, number> = {
    tomorrow: 0,
    this_week: 0,
    later: 0,
  };

  for (const consequence of candidates) {
    if (selected.length >= MAX_BRIEF_ITEMS) break;

    const group = timeGroupForConsequence(consequence);
    if (!group) continue;
    if (counts[group] >= MAX_PER_GROUP[group]) continue;

    const text = refineSurfaceText(consequence, busyMorning);
    if (briefFactsOverlap(text, lede)) continue;
    if (selected.some((entry) => briefFactsOverlap(entry.text, text))) continue;

    selected.push({ group, text });
    counts[group] += 1;
  }

  return GROUP_ORDER.map((group) => {
    const paragraphs = selected
      .filter((entry) => entry.group === group)
      .map((entry) => entry.text);
    if (paragraphs.length === 0) return null;
    return {
      id: "noticing" as const,
      label: GROUP_LABELS[group],
      paragraphs,
    };
  }).filter((section): section is CuratedBriefSection => section != null);
}

export function composeCuratedBrief(options: {
  consequences: SyncConsequence[];
  priorities?: string[];
  hasUserContext: boolean;
  emptyNoContext: string;
  emptyQuiet: string;
}): {
  lede: string;
  sections: CuratedBriefSection[];
  isEmpty: boolean;
} {
  const priorities = options.priorities ?? [];
  const consequences = options.consequences;

  if (!options.hasUserContext) {
    return {
      lede: options.emptyNoContext,
      sections: [],
      isEmpty: true,
    };
  }

  const tomorrowLoad = assessTomorrowLoad(consequences);
  const loadHeadline = headlineForTomorrowLoad(tomorrowLoad);

  const headlineCandidates = consequences
    .filter(
      (consequence) =>
        consequence.horizon === "headline" &&
        consequence.briefEligible &&
        consequence.kind !== "day_synthesis",
    )
    .sort((a, b) => a.priority - b.priority);

  const specificHeadline = headlineCandidates[0]?.surfaceText ?? null;

  let lede =
    loadHeadline ??
    consequences.find((consequence) => consequence.kind === "day_synthesis")
      ?.surfaceText ??
    specificHeadline ??
    (consequences.some((consequence) => consequence.briefEligible)
      ? options.emptyQuiet
      : options.emptyNoContext);

  if (
    loadHeadline &&
    specificHeadline &&
    (specificHeadline.includes("birthday") ||
      specificHeadline.includes("off tomorrow") ||
      specificHeadline.includes("due tomorrow"))
  ) {
    lede = loadHeadline;
  }

  const busyMorning =
    tomorrowLoad.earlyStart ||
    tomorrowLoad.level === "busy" ||
    tomorrowLoad.level === "heavy";

  const sections = selectCuratedLines(
    consequences,
    priorities,
    busyMorning,
    lede,
  );

  const hasHeadline =
    lede !== options.emptyQuiet && lede !== options.emptyNoContext;
  const isEmpty = sections.length === 0 && !hasHeadline;

  return {
    lede: isEmpty ? options.emptyNoContext : lede,
    sections,
    isEmpty,
  };
}

export function busyMorningFromConsequences(
  consequences: SyncConsequence[],
): boolean {
  const assessment = assessTomorrowLoad(consequences);
  return (
    assessment.earlyStart ||
    assessment.level === "busy" ||
    assessment.level === "heavy"
  );
}

export function formatWorkStartLine(
  startTime: string,
  busyMorning: boolean,
): string {
  const time = formatSyncClock(startTime) ?? startTime;
  return busyMorning
    ? `Work begins at ${time} after a busy morning.`
    : `Work begins at ${time}.`;
}
