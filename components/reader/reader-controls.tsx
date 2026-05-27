"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
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
      "flex shrink-0 items-center justify-center rounded-lg transition-all duration-200 active:scale-95",
      priority === "primary"
        ? "h-11 w-11 border border-[#d4b16a]/35 bg-[#d4b16a]/14 text-[#f4d98d] shadow-[0_0_22px_rgba(212,177,106,0.13)] hover:bg-[#d4b16a]/20 hover:text-[#ffe9a8] sm:h-12 sm:w-12"
        : "h-9 w-9 text-white/55 hover:bg-white/[0.07] hover:text-white sm:h-10 sm:w-10",
      active && priority !== "primary" && "bg-white/5 text-[#d4b16a]",
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
    <div className="sticky z-40 -mx-3 mb-4 sm:-mx-4" style={{ top: "env(safe-area-inset-top, 0px)" }}>
      <div className="w-full px-3 py-2 sm:px-4">
        <div
          className="mx-auto w-full rounded-xl border border-white/10 bg-[#0b0c10]/90 px-2.5 py-2.5 shadow-lg shadow-black/25 backdrop-blur-xl sm:px-4"
          style={{ maxWidth: controlMaxWidth }}
        >
          {showProgress ? (
            <div className="mb-2 space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-[11px] font-medium text-white/55">
                <span className="flex min-w-0 items-center gap-2 truncate">
                  <Image src="/krvt-shield.svg" alt="" width={18} height={18} className="h-4 w-4 shrink-0" />
                  <span className="truncate">Chapter {chapterIndex + 1} of {totalChapters}</span>
                </span>
                <span className="shrink-0">{progressPercent}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-[#d4b16a] transition-[width] duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {paragraphIndex !== null && paragraphCount > 0 ? (
                <div className="flex items-center gap-2 text-[11px] text-white/45">
                  <span className="shrink-0">Paragraph {paragraphIndex + 1}/{paragraphCount}</span>
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-white/45 transition-[width] duration-300"
                      style={{ width: `${paragraphProgressPercent}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex min-h-10 w-full items-center justify-between gap-2">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              aria-label="Previous chapter"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.025] text-white/62 transition hover:border-[#d4b16a]/25 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-35 sm:w-11"
            >
              <SkipBack size={17} />
            </button>

            <div className="flex min-w-0 flex-1 items-center justify-center gap-1 sm:gap-3">

              <IconBtn onClick={onBookmark} label="Bookmark" active={isBookmarked}>
                <Bookmark size={18} className="sm:w-5 sm:h-5" />
              </IconBtn>

              <Link
                href={`/novel?id=${novel.id}`}
                aria-label="Novel details"
                title="Novel details"
                className={iconButtonClass(false)}
              >
                <Info size={18} className="sm:w-5 sm:h-5" />
              </Link>

              <IconBtn onClick={onToggleTts} label={ttsLabel} active={isTtsActive} priority="primary">
                {ttsState === "playing" ? (
                  <Pause size={20} className="sm:h-[22px] sm:w-[22px]" />
                ) : ttsState === "paused" ? (
                  <Play size={20} className="sm:h-[22px] sm:w-[22px]" />
                ) : (
                  <Volume2 size={20} className="sm:h-[22px] sm:w-[22px]" />
                )}
              </IconBtn>

              {isTtsActive && onStopTts ? (
                <IconBtn onClick={onStopTts} label="Stop reading">
                  <Square size={16} className="sm:w-4 sm:h-4 fill-current" />
                </IconBtn>
              ) : null}

              <IconBtn onClick={onOpenSettings} label="Settings">
                <Settings size={18} className="sm:w-5 sm:h-5" />
              </IconBtn>

              <IconBtn onClick={onOpenChapters} label="Chapters" active={isChapterPanelOpen}>
                <List size={18} className="sm:w-5 sm:h-5" />
              </IconBtn>

            </div>
            <button
              onClick={onNext}
              disabled={!hasNext}
              aria-label="Next chapter"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.025] text-white/62 transition hover:border-[#d4b16a]/25 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-35 sm:w-11"
            >
              <SkipForward size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function iconButtonClass(active?: boolean) {
  return cn(
    "flex shrink-0 items-center justify-center rounded-lg sm:rounded-xl",
    "h-9 w-9 sm:h-10 sm:w-10",
    "text-white/55 transition-all duration-200",
    "hover:bg-white/[0.07] hover:text-white active:scale-95",
    active && "bg-white/5 text-[#d4b16a]",
  );
}
