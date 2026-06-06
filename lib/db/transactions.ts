import { Domain, EventSource } from "@prisma/client";

import { getOrCreateCategory } from "@/lib/db/categories";
import { dbTransactionToUi, dollarsToCents } from "@/lib/db/mappers";
import { getDefaultWorkspace } from "@/lib/db/workspace";
import { prisma } from "@/lib/prisma";

export async function listTransactions() {
  const { workspace } = await getDefaultWorkspace();

  const rows = await prisma.transaction.findMany({
    where: { workspaceId: workspace.id, deletedAt: null },
    include: { category: true },
    orderBy: { occurredAt: "desc" },
  });

  return rows.map(dbTransactionToUi);
}

export async function createTransaction(input: {
  name: string;
  category: string;
  amount: number;
  occurredAt: Date;
}) {
  const { workspace } = await getDefaultWorkspace();
  const category = await getOrCreateCategory(
    workspace.id,
    Domain.FINANCE,
    input.category,
  );

  const amountCents = dollarsToCents(input.amount);

  return prisma.$transaction(async (tx) => {
    const event = await tx.event.create({
      data: {
        workspaceId: workspace.id,
        domain: Domain.FINANCE,
        title: input.name,
        categoryId: category.id,
        startsAt: input.occurredAt,
        allDay: true,
        source: EventSource.LOGGED,
        amountCents,
      },
    });

    const transaction = await tx.transaction.create({
      data: {
        workspaceId: workspace.id,
        eventId: event.id,
        name: input.name,
        categoryId: category.id,
        amountCents,
        occurredAt: input.occurredAt,
      },
      include: { category: true },
    });

    return dbTransactionToUi(transaction);
  });
}
