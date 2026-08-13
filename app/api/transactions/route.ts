import { NextResponse } from "next/server";

import { loadRequestIdentity } from "@/lib/auth/load-request-identity";
import { trustedWorkspaceId } from "@/lib/auth/ownership";
import { listTransactions, createTransaction } from "@/lib/db/transactions";

export async function GET() {
  const loaded = await loadRequestIdentity();
  if (!loaded.ok) return loaded.response;

  try {
    const transactions = await listTransactions(loaded.identity.workspace.id);
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
  const loaded = await loadRequestIdentity();
  if (!loaded.ok) return loaded.response;

  try {
    const body = await request.json();
    const { name, category, amount, dateISO } = body as {
      name?: string;
      category?: string;
      amount?: number;
      dateISO?: string;
      userId?: string;
      ownerId?: string;
      workspaceId?: string;
    };

    if (!name?.trim() || !category || typeof amount !== "number" || !dateISO) {
      return NextResponse.json(
        { error: "name, category, amount, and dateISO are required" },
        { status: 400 },
      );
    }

    const workspaceId = trustedWorkspaceId(loaded.identity, body);
    const transaction = await createTransaction(workspaceId, {
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
