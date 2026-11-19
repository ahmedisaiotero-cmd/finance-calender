/**
 * One-shot migration: encrypt plaintext capture rows with
 * SYNC_CAPTURE_ENCRYPTION_KEY. Requires DATABASE_URL.
 *
 *   npx tsx scripts/encrypt-existing-captures.ts
 */

import { migratePlaintextCaptureRows } from "@/lib/crypto/migrate-capture-plaintext";
import { prisma } from "@/lib/prisma";

async function main() {
  const counts = await migratePlaintextCaptureRows(prisma);
  console.log("Encrypted existing capture rows:", counts);
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Capture encryption migration failed",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
