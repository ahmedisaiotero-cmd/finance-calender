import {
  Domain,
  EventSource,
  PrismaClient,
  RecurringRuleType,
  TimelineItemStatus,
} from "@prisma/client";

import { resolveTransactionDate, transactionReferenceDate } from "../lib/build-calendar-events";
import { categoryBudgets } from "../src/data/budgets";
import { oneTimeEvents } from "../src/data/calendar-events";
import { recurringBills } from "../src/data/recurring-events";
import { recentTransactions } from "../src/data/transactions";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@finance-calendar.local";

async function main() {
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "Ahmed",
      workspaces: {
        create: { name: "Personal" },
      },
    },
    include: { workspaces: true },
  });

  const workspace = user.workspaces[0];
  if (!workspace) throw new Error("Workspace missing");

  const categoryNames = [
    ...new Set([
      ...recentTransactions.map((t) => t.category),
      ...recurringBills.map((r) => r.category),
      ...oneTimeEvents.map((e) => e.category),
      ...categoryBudgets.map((b) => b.category),
    ]),
  ];

  const categories = new Map<string, string>();
  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({
      where: {
        workspaceId_domain_name: {
          workspaceId: workspace.id,
          domain: Domain.FINANCE,
          name,
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        domain: Domain.FINANCE,
        name,
      },
    });
    categories.set(name, cat.id);
  }

  for (const bill of recurringBills) {
    await prisma.recurringRule.upsert({
      where: { id: `seed-recurring-${bill.id}` },
      update: {
        title: bill.title,
        amountCents: Math.round(bill.amount * 100),
        ruleConfig: { dayOfMonth: bill.dayOfMonth },
        categoryId: categories.get(bill.category),
      },
      create: {
        id: `seed-recurring-${bill.id}`,
        workspaceId: workspace.id,
        domain: Domain.FINANCE,
        title: bill.title,
        categoryId: categories.get(bill.category),
        ruleType: RecurringRuleType.MONTHLY,
        ruleConfig: { dayOfMonth: bill.dayOfMonth },
        amountCents: Math.round(bill.amount * 100),
        startsOn: new Date("2026-01-01"),
      },
    });
  }

  for (const item of oneTimeEvents) {
    const categoryId = categories.get(item.category);
    await prisma.event.upsert({
      where: { id: `seed-event-${item.id}` },
      update: {
        title: item.title,
        startsAt: new Date(item.date),
        amountCents: Math.round(item.amount * 100),
        categoryId,
      },
      create: {
        id: `seed-event-${item.id}`,
        workspaceId: workspace.id,
        domain: Domain.FINANCE,
        title: item.title,
        categoryId,
        startsAt: new Date(item.date),
        source: EventSource.IMPORTED,
        amountCents: Math.round(item.amount * 100),
      },
    });
  }

  for (const tx of recentTransactions) {
    const iso =
      tx.dateISO ?? resolveTransactionDate(tx.date, transactionReferenceDate);
    const categoryId = categories.get(tx.category);
    if (!categoryId) continue;

    const eventId = `seed-tx-event-${tx.id}`;
    const txId = `seed-tx-${tx.id}`;

    await prisma.event.upsert({
      where: { id: eventId },
      update: {
        title: tx.name,
        startsAt: new Date(iso),
        amountCents: Math.round(tx.amount * 100),
        categoryId,
      },
      create: {
        id: eventId,
        workspaceId: workspace.id,
        domain: Domain.FINANCE,
        title: tx.name,
        categoryId,
        startsAt: new Date(iso),
        source: EventSource.LOGGED,
        amountCents: Math.round(tx.amount * 100),
      },
    });

    await prisma.transaction.upsert({
      where: { id: txId },
      update: {
        name: tx.name,
        amountCents: Math.round(tx.amount * 100),
        occurredAt: new Date(iso),
        categoryId,
      },
      create: {
        id: txId,
        workspaceId: workspace.id,
        eventId,
        name: tx.name,
        categoryId,
        amountCents: Math.round(tx.amount * 100),
        occurredAt: new Date(iso),
      },
    });
  }

  const budget = await prisma.budget.upsert({
    where: { id: "seed-budget-default" },
    update: { name: "Monthly default", active: true },
    create: {
      id: "seed-budget-default",
      workspaceId: workspace.id,
      name: "Monthly default",
      active: true,
    },
  });

  for (const line of categoryBudgets) {
    const categoryId = categories.get(line.category);
    if (!categoryId) continue;

    await prisma.budgetLine.upsert({
      where: {
        budgetId_categoryId: {
          budgetId: budget.id,
          categoryId,
        },
      },
      update: { limitCents: Math.round(line.limit * 100) },
      create: {
        budgetId: budget.id,
        categoryId,
        limitCents: Math.round(line.limit * 100),
      },
    });
  }

  await seedTimelineItems(workspace.id, new Date());

  console.log("Seed complete for workspace:", workspace.id);
}

function noonDate(reference: Date, dayOffset = 0) {
  const date = new Date(reference);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(12, 0, 0, 0);
  return date;
}

async function seedTimelineItems(workspaceId: string, reference: Date) {
  const items = [
    {
      id: "seed-timeline-morning-run",
      title: "Morning Run",
      category: "health",
      date: noonDate(reference, 0),
      status: TimelineItemStatus.PLANNED,
      detail: { time: "7:00 AM", durationMinutes: 30 },
    },
    {
      id: "seed-timeline-protein-goal",
      title: "Protein Goal",
      category: "health",
      date: noonDate(reference, 0),
      status: TimelineItemStatus.PLANNED,
      detail: { segment: "42g of protein remaining today", remaining: 42 },
    },
    {
      id: "seed-timeline-rent-due",
      title: "Rent Due",
      category: "money",
      date: noonDate(reference, 1),
      status: TimelineItemStatus.DUE,
      detail: { amount: -1200 },
    },
    {
      id: "seed-timeline-product-review",
      title: "Product Review",
      category: "career",
      date: noonDate(reference, 0),
      status: TimelineItemStatus.DUE,
      detail: { time: "2:00 PM", note: "Draft due" },
    },
  ] as const;

  for (const item of items) {
    await prisma.timelineItem.upsert({
      where: { id: item.id },
      update: {
        title: item.title,
        category: item.category,
        date: item.date,
        status: item.status,
        detail: item.detail,
      },
      create: {
        id: item.id,
        workspaceId,
        title: item.title,
        category: item.category,
        date: item.date,
        status: item.status,
        detail: item.detail,
      },
    });
  }

  console.log("Seeded", items.length, "timeline items");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
