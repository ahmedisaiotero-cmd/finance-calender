import { PersistentAppShell } from "@/components/dashboard/persistent-app-shell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PersistentAppShell>{children}</PersistentAppShell>;
}
