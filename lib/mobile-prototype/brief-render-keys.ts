import type { BriefSection } from "@/lib/mobile-prototype/build-daily-brief";

export function briefSectionKey(
  section: Pick<BriefSection, "id" | "label">,
  index: number,
): string {
  const base = section.id ?? section.label ?? "section";
  return `${base}-${index}`;
}

export function briefParagraphKey(
  section: Pick<BriefSection, "id" | "label">,
  sectionIndex: number,
  paragraphIndex: number,
): string {
  return `${briefSectionKey(section, sectionIndex)}-p-${paragraphIndex}`;
}

export function briefSectionKeysAreUnique(
  sections: Array<Pick<BriefSection, "id" | "label">>,
): boolean {
  const keys = sections.map((section, index) => briefSectionKey(section, index));
  return new Set(keys).size === keys.length;
}
