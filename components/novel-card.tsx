"use client";

import Link from "next/link";
import Image from "next/image";

import type { NovelSummary } from "@/types";

type NovelCardProps = {
  novel: NovelSummary;
  viewMode?: "grid" | "list";
};

export function NovelCard({ novel, viewMode = "grid" }: NovelCardProps) {
  const detailsHref = `/novel?id=${novel.id}`;

  const isList = viewMode === "list";

  if (isList) {
    return (
      <Link
        href={detailsHref}
        className="group flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2 text-white transition hover:border-white/20 hover:bg-white/[0.06] sm:gap-4 sm:p-3"
      >
        <div
          className="h-[90px] w-[60px] sm:h-[110px] sm:w-[75px] shrink-0 rounded-lg bg-cover bg-center border border-white/10 overflow-hidden"
          style={getCoverStyle(novel)}
        />
        <div className="flex min-w-0 flex-1 flex-col justify-center space-y-1">
          <h2 className="truncate text-sm sm:text-base font-semibold group-hover:text-accent">
            {novel.title}
          </h2>
          <p className="truncate text-xs text-white/70">{novel.author || "Unknown"}</p>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/50">
            <span>{novel.chapterCount} Ch</span>
            <span>•</span>
            <span className={novel.isCompleted ? "text-emerald-400/80" : ""}>
              {novel.isCompleted ? "Completed" : novel.status || "Ongoing"}
            </span>
          </div>
          {novel.description && (
             <p className="line-clamp-1 sm:line-clamp-2 text-xs leading-4 sm:leading-5 text-white/60 mt-1">
               {novel.description}
             </p>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={detailsHref}
      className="group flex flex-col rounded-xl border border-white/10 bg-white/[0.04] p-2 text-white shadow-sm transition hover:-translate-y-1 hover:bg-white/[0.08] hover:shadow-lg sm:p-3"
    >
      <div className="relative w-full h-[140px] sm:h-[160px] md:h-[180px] overflow-hidden rounded-lg border border-white/10 mb-2 sm:mb-3">
        {novel.image ? (
          <Image
            src={novel.image}
            alt={novel.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-[#2a2a2a] to-black" />
        )}
      </div>
      <h2 className="line-clamp-2 text-xs sm:text-sm font-semibold group-hover:text-accent leading-snug">
        {novel.title}
      </h2>
      <p className="mt-1 truncate text-[10px] sm:text-xs text-white/60">{novel.author || "Unknown"}</p>
    </Link>
  );
}

function getCoverStyle(novel: NovelSummary) {
  if (novel.image?.trim()) {
    return {
      backgroundImage: `url("${novel.image}")`,
    };
  }

  return {
    background:
      "linear-gradient(180deg, rgba(212,177,106,0.18) 0%, rgba(92,67,139,0.28) 45%, rgba(12,12,16,0.9) 100%)",
  };
}
