/**
 * Verifies sync-ios engine wrappers stay thin re-exports of shared Sync intelligence.
 * Runs at the iOS package boundary — does not require React Native resolution.
 */
const fs = require("fs");
const path = require("path");

const engineDir = path.join(__dirname, "..", "lib", "engine");
const expected = {
  "build-daily-brief.ts":
    'export * from "../../shared/mobile-prototype/build-daily-brief";',
  "build-today-view.ts":
    'export * from "../../shared/mobile-prototype/build-today-view";',
  "capture-brief-input.ts":
    'export * from "../../shared/mobile-prototype/capture-brief-input";',
};

let failed = false;
for (const [file, expectedLine] of Object.entries(expected)) {
  const fullPath = path.join(engineDir, file);
  if (!fs.existsSync(fullPath)) {
    console.error(`missing wrapper: ${file}`);
    failed = true;
    continue;
  }
  const content = fs.readFileSync(fullPath, "utf8").trim();
  if (content !== expectedLine) {
    console.error(`wrapper must remain a thin shared re-export: ${file}`);
    console.error(`  expected: ${expectedLine}`);
    console.error(`  actual:   ${content}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("sync-ios engine wrappers verified");
