import assert from "node:assert/strict";

import {
  detectWorkAvailability,
  isWorkDayOffItem,
  isWorkDayOffLanguage,
} from "@/lib/sync-capture/work-availability";

assert.equal(isWorkDayOffLanguage("I don't work tomorrow"), true);
assert.equal(isWorkDayOffLanguage("i dont work tomorrow"), true);
assert.equal(isWorkDayOffLanguage("I'm off Friday"), true);
assert.equal(isWorkDayOffLanguage("cancel work tomorrow"), true);
assert.equal(isWorkDayOffLanguage("I have overtime tomorrow"), false);
assert.equal(isWorkDayOffLanguage("I work Sunday through Wednesday"), false);

assert.equal(detectWorkAvailability("I don't work tomorrow"), "off");
assert.equal(detectWorkAvailability("I have overtime tomorrow"), "overtime");

assert.equal(
  isWorkDayOffItem({
    title: "Day Off Tomorrow",
    prompt: "I don't work tomorrow",
    workAvailability: "off",
  }),
  true,
);

console.log("work-availability tests passed");
