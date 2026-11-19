import { NextResponse } from "next/server";

import { buildHealthReport } from "@/lib/api/health";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const report = await buildHealthReport({
    pingDatabase: async () => {
      await prisma.$queryRaw`SELECT 1`;
    },
  });
  return NextResponse.json(report, { status: report.ok ? 200 : 503 });
}
