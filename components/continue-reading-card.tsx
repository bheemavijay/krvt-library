"use client";

import { useSyncExternalStore } from "react";

import type { NovelSummary } from "@/types";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getReadingState,
  getServerReadingState,
  subscribeToReadingState,
} from "@/lib/reader-storage";
import { getReadingProgress } from "@/lib/utils";

type ContinueReadingCardProps = {
  novels: NovelSummary[];
};

export function ContinueReadingCard({ novels }: ContinueReadingCardProps) {
  const readingState = useSyncExternalStore(
    subscribeToReadingState,
    getReadingState,
    getServerReadingState,
  );

  const novel =
    novels.find((item) => item.id === readingState.lastOpenedNovelId) ?? null;

  const chapterIndex = novel
    ? readingState.progressByNovel[novel.id]?.chapterIndex ?? 0
    : 0;

  if (!novel) {
    return null;
  }

  return (
    <Card className="rounded-[1.75rem] bg-panel-strong/80 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.32em] text-accent">Continue Reading</p>
          <div className="space-y-1">
            <h2 className="font-heading text-2xl text-foreground sm:text-3xl">{novel.title}</h2>
            <p className="text-sm text-muted">by {novel.author}</p>
            <p className="text-sm text-muted-strong">
              {getReadingProgress(chapterIndex + 1, novel.chapterCount)}
            </p>
          </div>
        </div>
        <Button href={`/novel/${novel.id}/${chapterIndex + 1}`} className="w-full sm:w-auto">
          Continue Reading
        </Button>
      </div>
    </Card>
  );
}
