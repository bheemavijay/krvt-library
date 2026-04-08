"use client";

import { useSyncExternalStore } from "react";

import type { Novel, NovelSummary } from "@/types";

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
  novelDetails: Novel[];
};

export function ContinueReadingCard({ novels, novelDetails }: ContinueReadingCardProps) {
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
  const detailedNovel = novelDetails.find((item) => item.id === novel?.id) ?? null;
  const lastChapter = detailedNovel?.chapters[chapterIndex] ?? null;

  if (!novel) {
    return null;
  }

  return (
    <Card className="relative overflow-hidden rounded-[2rem] border-accent/20 bg-[linear-gradient(135deg,rgba(212,177,106,0.18),rgba(15,17,22,0.94)_48%,rgba(15,17,22,0.98))] p-5 sm:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_34%)]" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.32em] text-accent">Continue Reading</p>
            <div className="space-y-1">
              <h2 className="font-heading text-3xl text-foreground sm:text-4xl">{novel.title}</h2>
              <p className="text-sm text-muted sm:text-base">by {novel.author}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.25rem] border border-white/10 bg-white/6 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.28em] text-accent">Last Chapter Read</p>
              <p className="mt-2 text-base text-foreground sm:text-lg">
                {lastChapter
                  ? `Chapter ${lastChapter.order}: ${lastChapter.title}`
                  : `Chapter ${chapterIndex + 1}`}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-white/10 bg-white/6 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.28em] text-accent">Reading Progress</p>
              <p className="mt-2 text-base text-foreground sm:text-lg">
                {getReadingProgress(chapterIndex + 1, novel.chapterCount)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-56">
          <p className="text-sm leading-7 text-muted-strong">
            Jump back into your latest chapter and keep your momentum without hunting
            through the library.
          </p>
          <Button
            href={`/novel/${novel.id}/${chapterIndex + 1}`}
            className="w-full border-accent/40 bg-accent-soft text-accent hover:border-accent hover:bg-accent-soft/80"
          >
            Resume Reading
          </Button>
        </div>
      </div>
    </Card>
  );
}
