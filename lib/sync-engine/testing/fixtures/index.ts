import { contradictionTests } from "@/lib/sync-engine/testing/fixtures/contradiction-tests";
import { consequenceTests } from "@/lib/sync-engine/testing/fixtures/consequence-tests";
import { followUpTests } from "@/lib/sync-engine/testing/fixtures/follow-up-tests";
import { memoryTests } from "@/lib/sync-engine/testing/fixtures/memory-tests";
import { patternTests } from "@/lib/sync-engine/testing/fixtures/pattern-tests";
import { relationshipTests } from "@/lib/sync-engine/testing/fixtures/relationship-tests";
import { securityTests } from "@/lib/sync-engine/testing/security";

export const ALL_SYNC_ENGINE_TEST_SUITES = [
  memoryTests,
  consequenceTests,
  relationshipTests,
  patternTests,
  followUpTests,
  contradictionTests,
  securityTests,
] as const;

export {
  contradictionTests,
  consequenceTests,
  followUpTests,
  memoryTests,
  patternTests,
  relationshipTests,
  securityTests,
};
