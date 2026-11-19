import Link from "next/link";

import { Card } from "@/components/ui/card";

export default function LifePage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-2 py-4 sm:px-0">
      <header className="space-y-2">
        <h1 className="text-3xl font-medium tracking-[-0.04em]">My Life</h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          What Sync knows, when you want to inspect it. This is context — not a
          dashboard.
        </p>
      </header>

      <Card className="space-y-3">
        <h2 className="text-[16px] font-medium tracking-[-0.02em]">
          Account and captures
        </h2>
        <p className="text-[14px] leading-relaxed text-muted-foreground">
          View your profile, paired devices, export, or delete your data in
          Settings. AI activity you saved from the browser add-on lives with
          your account.
        </p>
        <p className="text-[14px]">
          <Link
            href="/settings"
            className="text-foreground underline-offset-2 hover:underline"
          >
            Open Settings
          </Link>
        </p>
      </Card>
    </div>
  );
}
