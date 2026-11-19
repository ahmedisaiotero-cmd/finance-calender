import type { PrismaClient } from "@prisma/client";

import {
  legalAcceptanceRecord,
  type LegalAcceptanceSuccess,
} from "@/lib/auth/legal-acceptance";
import { prisma } from "@/lib/prisma";

export async function applyLegalAcceptanceToUser(
  userId: string,
  accepted: LegalAcceptanceSuccess,
  db: PrismaClient = prisma,
) {
  const record = legalAcceptanceRecord(accepted);
  return db.user.update({
    where: { id: userId },
    data: record,
  });
}
