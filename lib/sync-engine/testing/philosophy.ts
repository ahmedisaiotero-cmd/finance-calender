export type SyncEnginePhilosophyRule = {
  id: string;
  rule: string;
};

export const SYNC_ENGINE_PHILOSOPHY_RULES: SyncEnginePhilosophyRule[] = [
  {
    id: "P1",
    rule: "Remember consequences, not conversations.",
  },
  {
    id: "P2",
    rule: "Prefer updating memories over creating duplicates.",
  },
  {
    id: "P3",
    rule: "Ask questions only when the answer changes future decisions.",
  },
  {
    id: "P4",
    rule: "Surface information only when timing matters.",
  },
  {
    id: "P5",
    rule: "Stay quiet when there is no clear value.",
  },
  {
    id: "P6",
    rule: "Use uncertainty instead of fake confidence.",
  },
  {
    id: "P7",
    rule: "Personal data should be treated as sensitive by default.",
  },
  {
    id: "P8",
    rule: "Health, money, and relationship information require extra care.",
  },
  {
    id: "P9",
    rule: "The user should be able to inspect, correct, and delete what Sync thinks.",
  },
  {
    id: "P10",
    rule: "The engine should explain its reasoning in debug mode, not in normal user replies.",
  },
];

export type SyncEnginePhilosophyRuleId =
  (typeof SYNC_ENGINE_PHILOSOPHY_RULES)[number]["id"];

export function philosophyRuleLabel(id: SyncEnginePhilosophyRuleId) {
  const rule = SYNC_ENGINE_PHILOSOPHY_RULES.find((item) => item.id === id);
  return rule ? `${rule.id}: ${rule.rule}` : id;
}
