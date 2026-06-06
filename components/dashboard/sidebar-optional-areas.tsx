"use client";

import { SidebarOptionalAreaItem } from "@/components/dashboard/sidebar-optional-area-item";
import type { OptionalAreaItem } from "@/lib/user-life-areas";

type SidebarOptionalAreasProps = {
  areas: OptionalAreaItem[];
  onNavigate?: () => void;
};

export function SidebarOptionalAreas({
  areas,
  onNavigate,
}: SidebarOptionalAreasProps) {
  if (areas.length === 0) return null;

  return (
    <section className="sync-sidebar-optional" aria-label="Optional areas">
      <p className="sync-sidebar-optional-label">Optional Areas</p>
      <div className="mt-0.5 flex flex-col gap-0.5">
        {areas.map((area) => (
          <SidebarOptionalAreaItem
            key={area.id}
            label={area.label}
            href={area.href}
            icon={area.icon}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </section>
  );
}
