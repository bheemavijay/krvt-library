"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

import type { NovelSummary } from "@/types";

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

  const chapterTitle = novel.chapterTitles?.[chapterIndex] ?? "";
  const progress = getReadingProgress(chapterIndex + 1, novel.chapterCount);

  return (
    <Card className="relative overflow-hidden rounded-lg border-white/8 bg-black/30 p-4 sm:p-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4b16a]/45 to-transparent" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.32em] text-accent">Continue Reading</p>
            <div className="space-y-1">
              <h2 className="font-heading text-2xl sm:text-3xl text-foreground">{novel.title}</h2>
              <p className="text-xs sm:text-sm text-muted sm:text-base">by {novel.author}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-white/8 bg-white/[0.03] p-3">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.28em] text-accent">Last Chapter Read</p>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-foreground lg:text-lg line-clamp-1">
                {chapterTitle
                  ? `Chapter ${chapterIndex + 1}: ${chapterTitle}`
                  : `Chapter ${chapterIndex + 1}`}
              </p>
            </div>
            <div className="rounded-md border border-white/8 bg-white/[0.03] p-3">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.28em] text-accent">Reading Progress</p>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-foreground lg:text-lg">
                {progress}
              </p>
              <p className="mt-1 text-xs text-white/55">
                Chapter {Math.min(chapterIndex + 1, Math.max(1, novel.chapterCount))} of {novel.chapterCount}
              </p>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-56">
          <p className="text-xs sm:text-sm leading-relaxed sm:leading-7 text-muted-foreground">
            Jump back into your latest chapter and keep your momentum without hunting
            through the library.
          </p>
          <Link
            href={`/reader?id=${novel.id}&chapter=${chapterIndex + 1}`}
            className="flex min-h-[40px] w-full items-center justify-center rounded-md border border-accent/30 bg-accent-soft/70 text-sm font-medium text-accent transition-colors hover:border-accent/55 hover:bg-accent-soft"
          >
            Resume Reading
          </Link>
        </div>
      </div>
    </Card>
  );
}
