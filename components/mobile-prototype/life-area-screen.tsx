"use client";

import type { LifeDrilldownView } from "@/lib/mobile-prototype/build-life-drilldown";
import { LifeDrilldownScreen } from "@/components/mobile-prototype/life-drilldown-screen";

type LifeAreaScreenProps = {
  view: LifeDrilldownView;
  onBack: () => void;
};

export function LifeAreaScreen({ view, onBack }: LifeAreaScreenProps) {
  return <LifeDrilldownScreen view={view} onBack={onBack} />;
}
