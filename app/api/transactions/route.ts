import { NextResponse } from "next/server";

import { listTransactions, createTransaction } from "@/lib/db/transactions";
import { isDatabaseConfigured } from "@/lib/prisma";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  try {
    const transactions = await listTransactions();
    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("GET /api/transactions", error);
    return NextResponse.json(
      { error: "Failed to load transactions" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const { name, category, amount, dateISO } = body as {
      name?: string;
      category?: string;
      amount?: number;
      dateISO?: string;
    };

    if (!name?.trim() || !category || typeof amount !== "number" || !dateISO) {
      return NextResponse.json(
        { error: "name, category, amount, and dateISO are required" },
        { status: 400 },
      );
    }

    const transaction = await createTransaction({
      name: name.trim(),
      category,
      amount,
      occurredAt: new Date(dateISO),
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    console.error("POST /api/transactions", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 },
    );
  }
}
