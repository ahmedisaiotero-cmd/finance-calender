import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const testsDir = join(repoRoot, "tests");

const files = readdirSync(testsDir, { recursive: true })
  .map((name) => String(name).replaceAll("\\", "/"))
  .filter((name) => name.endsWith(".test.ts"))
  .map((name) => join("tests", name))
  .sort();

if (files.length === 0) {
  console.error("No *.test.ts files found under tests/");
  process.exit(1);
}

const tsxCli = join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
const result = spawnSync(process.execPath, [tsxCli, "--test", ...files], {
  cwd: repoRoot,
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

if (result.signal) {
  process.exit(1);
}

process.exit(result.status === 0 ? 0 : (result.status ?? 1));
