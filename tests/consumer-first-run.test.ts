import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  hasCompletedConsumerFirstRun,
  shouldShowConsumerFirstRun,
} from "@/lib/auth/consumer-first-run";

{
  assert.equal(hasCompletedConsumerFirstRun(null), false);
  assert.equal(hasCompletedConsumerFirstRun("2026-11-19T12:00:00.000Z"), true);
}

{
  assert.equal(
    shouldShowConsumerFirstRun({ consumerFirstRunAt: null, pathname: "/" }),
    true,
  );
  assert.equal(
    shouldShowConsumerFirstRun({ consumerFirstRunAt: null, pathname: "/start" }),
    false,
  );
  assert.equal(
    shouldShowConsumerFirstRun({
      consumerFirstRunAt: "2026-11-19T12:00:00.000Z",
      pathname: "/",
    }),
    false,
  );
}

{
  const page = readFileSync(
    join(process.cwd(), "components/settings/consumer-first-run.tsx"),
    "utf8",
  );
  assert.match(page, /private record you control/i);
  assert.match(page, /In-app chat stays off/);
  assert.match(page, /not a task list or a briefing dashboard/);
  assert.equal(page.includes("streak"), false);
  assert.equal(/habit tracker/i.test(page), false);
}

console.log("consumer-first-run tests passed");
