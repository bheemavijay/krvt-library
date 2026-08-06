"use client";

import { ContinueReadingCard } from "@/components/continue-reading-card";
import type { NovelSummary } from "@/shared/types";

type ContinueReadingSectionProps = {
  novels: NovelSummary[];
};

export function ContinueReadingSection({ novels }: ContinueReadingSectionProps) {
  return (
    <div className="py-6 sm:py-8 mx-auto max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8">
      <ContinueReadingCard novels={novels} />
    </div>
  );
}
