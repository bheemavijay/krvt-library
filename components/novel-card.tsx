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
import { formatChapterLabel } from "@/lib/utils";

type NovelCardProps = {
  novel: NovelSummary;
};

export function NovelCard({ novel }: NovelCardProps) {
  const readingState = useSyncExternalStore(
    subscribeToReadingState,
    getReadingState,
    getServerReadingState,
  );
  const savedChapterIndex = readingState.progressByNovel[novel.id]?.chapterIndex ?? 0;
  const hasProgress = readingState.lastOpenedNovelId === novel.id;
  const href = hasProgress ? `/novel/${novel.id}/${savedChapterIndex + 1}` : `/novel/${novel.id}`;

  return (
    <Link href={href} className="group">
      <Card className="h-full p-5 group-hover:-translate-y-1.5 group-hover:border-accent/50 group-hover:bg-panel-strong group-hover:shadow-[var(--shadow)] sm:p-6">
        <div className="flex h-full flex-col justify-between gap-6 sm:gap-8">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-accent">Novel</p>
            <div className="space-y-2">
              <h2 className="font-heading text-xl text-foreground sm:text-2xl">{novel.title}</h2>
              <p className="text-sm text-muted">by {novel.author}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm text-muted">
            <span>{formatChapterLabel(novel.chapterCount)}</span>
            <span className="text-muted-strong transition group-hover:text-accent">
              {hasProgress ? "Continue" : "View details"}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
