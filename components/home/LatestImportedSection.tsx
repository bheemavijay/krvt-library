"use client";

import { useMemo } from "react";
import { HomeSection } from "@/components/home/HomeSection";
import { HorizontalNovelList } from "@/components/home/HorizontalNovelList";
import type { NovelSummary } from "@/shared/types";

type LatestImportedSectionProps = {
  novels: NovelSummary[];
};

export function LatestImportedSection({ novels }: LatestImportedSectionProps) {
  const latestNovels = useMemo(() => {
    return [...novels].sort((a, b) => Date.parse(b.lastUpdated ?? "") - Date.parse(a.lastUpdated ?? "")).slice(0, 12);
  }, [novels]);

  return (
    <HomeSection title="Latest Imported" viewAllHref="/?view=library&sort=lastImported">
      <HorizontalNovelList novels={latestNovels} />
    </HomeSection>
  );
}
