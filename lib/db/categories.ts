import type { Domain } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function getOrCreateCategory(
  workspaceId: string,
  domain: Domain,
  name: string,
) {
  return prisma.category.upsert({
    where: {
      workspaceId_domain_name: { workspaceId, domain, name },
    },
    update: {},
    create: { workspaceId, domain, name },
  });
}
