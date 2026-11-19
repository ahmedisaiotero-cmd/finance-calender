import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const yaml = readFileSync(join(process.cwd(), ".github/dependabot.yml"), "utf8");

{
  assert.match(yaml, /package-ecosystem: npm/);
  assert.match(yaml, /directory: \//);
  assert.match(yaml, /directory: \/sync-ios/);
  assert.match(yaml, /package-ecosystem: github-actions/);
  assert.match(yaml, /interval: weekly/);
  assert.equal(yaml.includes("docker"), false);
}

console.log("dependabot tests passed");
