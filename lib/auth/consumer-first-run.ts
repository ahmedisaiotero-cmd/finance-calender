import { prisma } from "@/lib/prisma";

export function hasCompletedConsumerFirstRun(
  completedAt: Date | string | null | undefined,
): boolean {
  if (!completedAt) return false;
  const value = completedAt instanceof Date ? completedAt : new Date(completedAt);
  return !Number.isNaN(value.getTime());
}

export function shouldShowConsumerFirstRun(input: {
  consumerFirstRunAt: Date | string | null | undefined;
  pathname: string;
}): boolean {
  if (hasCompletedConsumerFirstRun(input.consumerFirstRunAt)) return false;
  const path = input.pathname || "/";
  if (path === "/start" || path.startsWith("/start/")) return false;
  return true;
}

export async function completeConsumerFirstRun(input: {
  userId: string;
  at?: Date;
}): Promise<{ consumerFirstRunAt: Date }> {
  const consumerFirstRunAt = input.at ?? new Date();
  const user = await prisma.user.update({
    where: { id: input.userId },
    data: { consumerFirstRunAt },
    select: { consumerFirstRunAt: true },
  });
  return { consumerFirstRunAt: user.consumerFirstRunAt ?? consumerFirstRunAt };
}
