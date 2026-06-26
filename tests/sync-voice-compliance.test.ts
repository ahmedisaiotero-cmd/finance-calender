import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Forbidden user-facing phrases from SYNC_VOICE.md / SYNC_PRINCIPLES.md.
 * New violations fail the test; known legacy copy is allowlisted below.
 */
const FORBIDDEN_PHRASES = [
  "worth keeping in view",
  "You need to",
  "you need to",
  "You should",
  "you should",
  "stay on track",
  "on track",
  "moves the needle",
  "Build Momentum",
  "crush your day",
  "important items",
  "optimize productivity",
  "manage your tasks",
] as const;

/** Legacy violations tracked for Phase 1.75 voice cleanup — do not add new entries casually. */
const LEGACY_ALLOWLIST: Array<{ file: string; phrase: string; note: string }> = [
  {
    file: "lib/mobile-prototype/sync-voice.ts",
    phrase: "worth keeping in view",
    note: "CAPTURE_PREVIEW_WORTH_VIEW and describeImportance(medium)",
  },
  {
    file: "lib/trust/human-language.ts",
    phrase: "worth keeping in view",
    note: "humanizeMeaningSummary medium importance replacement",
  },
  {
    file: "lib/intelligence/memory-understanding.ts",
    phrase: "You need to",
    note: "school drop-off interpretation templates",
  },
  {
    file: "lib/intelligence/memory-understanding.ts",
    phrase: "you need to",
    note: "school drop-off interpretation templates",
  },
  {
    file: "lib/intelligence/forecast-engine.ts",
    phrase: "worth keeping in view",
    note: "forecast fallback copy",
  },
  {
    file: "lib/sync-pulse.ts",
    phrase: "Build Momentum",
    note: "legacy PulseState title",
  },
  {
    file: "lib/sync-pulse.ts",
    phrase: "moves the needle",
    note: "build-momentum Pulse message",
  },
  {
    file: "lib/sync-pulse.ts",
    phrase: "on track",
    note: "finance Pulse keeps you on track",
  },
  {
    file: "lib/sync-pulse.ts",
    phrase: "worth keeping in view",
    note: "calendar Pulse financial date message",
  },
  {
    file: "lib/sync-copy.ts",
    phrase: "on track",
    note: "legacy web finance page question",
  },
  {
    file: "lib/sync-lens-copy.ts",
    phrase: "worth keeping in view",
    note: "money lens subtitle",
  },
];

const SCAN_FILES = [
  "lib/mobile-prototype/sync-voice.ts",
  "lib/trust/human-language.ts",
  "lib/intelligence/memory-understanding.ts",
  "lib/intelligence/forecast-engine.ts",
  "lib/sync-pulse.ts",
  "lib/sync-copy.ts",
  "lib/sync-lens-copy.ts",
  "lib/mobile-prototype/build-home-reflection.ts",
  "lib/mobile-prototype/build-life-context.ts",
  "lib/mobile-prototype/build-life-observation.ts",
  "lib/mobile-prototype/build-memory-detail.ts",
  "lib/mobile-prototype/build-capture-confirmation.ts",
  "lib/pulse/templates.ts",
] as const;

const repoRoot = join(import.meta.dirname, "..");

function isGuardOrRegexLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.includes("FORBIDDEN_PHRASES") ||
    trimmed.includes("BANNED_OBSERVATION") ||
    trimmed.includes("FORBIDDEN_PHRASE") ||
    (trimmed.includes("/") && trimmed.includes("\\b"))
  );
}

function isAllowlisted(file: string, phrase: string): boolean {
  return LEGACY_ALLOWLIST.some(
    (entry) => entry.file === file && entry.phrase === phrase,
  );
}

function scanFile(relativePath: string) {
  const content = readFileSync(join(repoRoot, relativePath), "utf8");
  const lines = content.split(/\r?\n/);
  const violations: Array<{ line: number; phrase: string; text: string }> = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (isGuardOrRegexLine(line)) continue;

    for (const phrase of FORBIDDEN_PHRASES) {
      if (!line.includes(phrase)) continue;
      if (isAllowlisted(relativePath, phrase)) continue;
      violations.push({
        line: index + 1,
        phrase,
        text: line.trim(),
      });
    }
  }

  return violations;
}

{
  const allViolations = SCAN_FILES.flatMap((file) =>
    scanFile(file).map((violation) => ({ file, ...violation })),
  );

  assert.equal(
    allViolations.length,
    0,
    `Unexpected Sync voice violations (not in legacy allowlist):\n${allViolations
      .map(
        (violation) =>
          `  ${violation.file}:${violation.line} [${violation.phrase}] ${violation.text}`,
      )
      .join("\n")}`,
  );
}

{
  const allowlistHits = SCAN_FILES.flatMap((file) => {
    const content = readFileSync(join(repoRoot, file), "utf8");
    return LEGACY_ALLOWLIST.filter(
      (entry) => entry.file === file && content.includes(entry.phrase),
    );
  });

  assert.ok(
    allowlistHits.length > 0,
    "legacy allowlist should still document known violations pending cleanup",
  );
}

console.log("sync-voice-compliance tests passed");
console.log(
  `  legacy allowlist: ${LEGACY_ALLOWLIST.length} documented violation(s)`,
);
