"use client";

import Link from "next/link";
import { useMemo, useRef, WheelEvent } from "react";
import { ArrowRight } from "lucide-react";
import { NovelCard } from "@/components/novel-card";
import type { NovelSummary } from "@/shared/types";

type LatestImportedRowProps = {
  novels: NovelSummary[];
};

export function LatestImportedRow({ novels }: LatestImportedRowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const latestNovels = useMemo(() => {
    return [...novels]
      .sort((a, b) => Date.parse(b.lastUpdated ?? "") - Date.parse(a.lastUpdated ?? ""))
      .slice(0, 12);
  }, [novels]);

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft += event.deltaY;
    }
  };

  if (!latestNovels.length) {
    return null;
  }

  return (
    <section className="py-8 sm:py-12">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <h2 className="font-heading text-2xl font-medium text-[var(--krvt-fg)] sm:text-3xl">
            Latest Imported
          </h2>
          <Link href="/?view=library&sort=lastImported" className="flex items-center gap-2 text-sm text-[var(--krvt-accent)] transition-colors hover:text-[var(--krvt-fg)]">
            View All
            <ArrowRight size={16} />
          </Link>
        </div>
        <div
          ref={scrollContainerRef}
          onWheel={handleWheel}
          className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 -mb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`.${scrollContainerRef.current?.className}::-webkit-scrollbar { display: none; }`}</style>
          {latestNovels.map((novel) => (
            <div key={novel.id} className="w-[180px] sm:w-[220px] shrink-0">
              <NovelCard novel={novel} viewMode="grid" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
