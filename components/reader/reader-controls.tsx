"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/shared/utils";
import {
  Bookmark,
  Info,
  List,
  Pause,
  Play,
  Settings,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
} from "lucide-react";

type ReaderControlsProps = {
  novel: { id: string; title: string; chapters: Array<unknown> };
  chapterIndex: number;
  totalChapters: number;
  progressPercent: number;
  contentMaxWidth: number;
  paragraphIndex?: number | null;
  paragraphCount?: number;
  paragraphProgressPercent?: number;
  showProgress?: boolean;
  onOpenSettings: () => void;
  onToggleTts?: () => void;
  onBookmark?: () => void;
  onOpenChapters?: () => void;
  isBookmarked?: boolean;
  isChapterPanelOpen?: boolean;
  ttsState?: "idle" | "playing" | "paused" | "stopped";
  onPrev?: () => void;
  onNext?: () => void;
  onStopTts?: () => void;
};

const IconBtn = ({
  onClick,
  label,
  active,
  priority = "tertiary",
  children,
}: {
  onClick?: () => void;
  label: string;
  active?: boolean;
  priority?: "primary" | "tertiary";
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    aria-label={label}
    title={label}
    className={cn(
      "flex shrink-0 items-center justify-center rounded-full transition-all duration-200 active:scale-95",
      priority === "primary"
        ? "h-10 w-10 bg-[#d4b16a] text-[#08090c] shadow-md shadow-[#d4b16a]/20 hover:scale-105 sm:h-11 sm:w-11"
        : "h-8 w-8 text-white/30 hover:bg-white/10 hover:text-white/80 sm:h-9 sm:w-9",
      active && priority !== "primary" && "bg-white/10 text-[#d4b16a]",
    )}
  >
    {children}
  </button>
);

export default function ReaderControls({
  novel,
  chapterIndex,
  totalChapters,
  progressPercent,
  contentMaxWidth,
  paragraphIndex = null,
  paragraphCount = 0,
  paragraphProgressPercent = 0,
  showProgress = true,
  onOpenSettings,
  onToggleTts,
  onBookmark,
  onOpenChapters,
  isBookmarked = false,
  isChapterPanelOpen = false,
  ttsState = "idle",
  onPrev,
  onNext,
  onStopTts,
}: ReaderControlsProps) {
  const isTtsActive = ttsState === "playing" || ttsState === "paused";
  const hasPrev = chapterIndex > 0;
  const hasNext = chapterIndex < totalChapters - 1;
  const controlMaxWidth = contentMaxWidth >= 9999 ? "100%" : `${contentMaxWidth}px`;
  const ttsLabel =
    ttsState === "playing" ? "Pause reading" : ttsState === "paused" ? "Resume reading" : "Read aloud";

  return (
    <div
      className="sticky top-[49px] z-40 px-2 py-2 pointer-events-none sm:top-[57px] sm:px-4"
    >
      <div
        className="pointer-events-auto mx-auto flex w-full flex-col gap-1 rounded-2xl border border-white/5 bg-[#0b0c10]/85 px-3 py-1 shadow-md shadow-black/20 backdrop-blur-xl"
        style={{ maxWidth: controlMaxWidth }}
      >
        {showProgress ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-[10px] font-medium text-white/40">
              <span className="flex min-w-0 items-center gap-1.5 truncate">
                <Image src="/logo.png" alt="" width={14} height={14} className="h-3.5 w-3.5 shrink-0 opacity-50" />
                <span className="truncate">Chapter {chapterIndex + 1} of {totalChapters}</span>
              </span>
              <span className="shrink-0">{progressPercent}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-[#d4b16a] transition-[width] duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {paragraphIndex !== null && paragraphCount > 0 ? (
              <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                <span className="shrink-0">Paragraph {paragraphIndex + 1}/{paragraphCount}</span>
                <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-white/30 transition-[width] duration-300"
                    style={{ width: `${paragraphProgressPercent}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex w-full items-center justify-between gap-1 sm:gap-2">
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            aria-label="Previous chapter"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-20 sm:h-9 sm:w-9"
          >
            <SkipBack size={16} className="sm:h-[18px] sm:w-[18px]" />
          </button>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5 sm:gap-2">
            <IconBtn onClick={onBookmark} label="Bookmark" active={isBookmarked}>
              <Bookmark size={16} className="sm:h-[18px] sm:w-[18px]" />
            </IconBtn>

            <Link
              href={`/novel?id=${novel.id}`}
              aria-label="Novel details"
              title="Novel details"
              className={iconButtonClass(false)}
            >
              <Info size={16} className="sm:h-[18px] sm:w-[18px]" />
            </Link>

            <IconBtn onClick={onToggleTts} label={ttsLabel} active={isTtsActive} priority="primary">
              {ttsState === "playing" ? (
                <Pause size={18} className="fill-current sm:h-5 sm:w-5" />
              ) : ttsState === "paused" ? (
                <Play size={18} className="ml-0.5 fill-current sm:h-5 sm:w-5" />
              ) : (
                <Volume2 size={18} className="sm:h-5 sm:w-5" />
              )}
            </IconBtn>

            {isTtsActive && onStopTts ? (
              <IconBtn onClick={onStopTts} label="Stop reading">
                <Square size={14} className="fill-current sm:h-[16px] sm:w-[16px]" />
              </IconBtn>
            ) : null}

            <IconBtn onClick={onOpenSettings} label="Settings">
              <Settings size={16} className="sm:h-[18px] sm:w-[18px]" />
            </IconBtn>

            <IconBtn onClick={onOpenChapters} label="Chapters" active={isChapterPanelOpen}>
              <List size={16} className="sm:h-[18px] sm:w-[18px]" />
            </IconBtn>
          </div>

          <button
            onClick={onNext}
            disabled={!hasNext}
            aria-label="Next chapter"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-20 sm:h-9 sm:w-9"
          >
            <SkipForward size={16} className="sm:h-[18px] sm:w-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

function iconButtonClass(active?: boolean) {
  return cn(
    "flex shrink-0 items-center justify-center rounded-full transition-all duration-200 active:scale-95",
    "h-8 w-8 text-white/30 hover:bg-white/10 hover:text-white/80 sm:h-9 sm:w-9",
    active && "bg-white/10 text-[#d4b16a]",
  );
}
