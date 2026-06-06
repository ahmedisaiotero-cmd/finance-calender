import { prisma } from "@/lib/prisma";

const DEMO_USER_EMAIL = "demo@finance-calendar.local";

export async function getDefaultWorkspace() {
  let user = await prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
    include: {
      workspaces: { take: 1, orderBy: { createdAt: "asc" } },
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: DEMO_USER_EMAIL,
        name: "Ahmed",
        workspaces: {
          create: { name: "Personal" },
        },
      },
      include: {
        workspaces: { take: 1, orderBy: { createdAt: "asc" } },
      },
    });
  }

  const workspace = user.workspaces[0];
  if (!workspace) {
    throw new Error("No workspace found for demo user");
  }

  return { user, workspace };
}
