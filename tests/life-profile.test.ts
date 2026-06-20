import assert from "node:assert/strict";

import { parseTypicalWeekToSchedule } from "@/lib/mobile-prototype/apply-life-profile";
import { splitComingUpLines } from "@/lib/mobile-prototype/life-profile";

{
  const schedule = parseTypicalWeekToSchedule(
    "I work Sunday through Wednesday from 11 AM to 9 PM",
    new Date("2026-06-14"),
  );
  assert.ok(schedule);
  assert.deepEqual(schedule?.days, ["SU", "MO", "TU", "WE"]);
  assert.equal(schedule?.startTime, "11:00");
  assert.equal(schedule?.endTime, "21:00");
}

{
  const lines = splitComingUpLines(
    "Mom's birthday June 22.\nPayday Friday.\nTrip next month.",
  );
  assert.equal(lines.length, 3);
  assert.match(lines[0], /Mom's birthday/i);
}

console.log("life-profile tests passed");
