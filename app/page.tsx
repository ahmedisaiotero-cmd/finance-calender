import { AppShell } from "@/components/dashboard/app-shell";
import { HomeContent } from "@/components/dashboard/home-content";

export default function Home() {
  return (
    <AppShell title="Today" layout="home">
      <HomeContent />
    </AppShell>
  );
}
