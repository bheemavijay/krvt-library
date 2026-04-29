"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Bookmark, Info, Volume2, Settings, List } from "lucide-react";

type ReaderControlsProps = {
  novel: { id: string; title: string; chapters: Array<unknown> };
  chapterIndex: number;
  onOpenSettings: () => void;
  onToggleTts?: () => void;
  onBookmark?: () => void;
  onOpenChapters?: () => void;
  isBookmarked?: boolean;
  isChapterPanelOpen?: boolean;
  ttsState?: "idle" | "playing" | "paused";
  onPrev?: () => void;
  onNext?: () => void;
};

const IconBtn = ({
  onClick,
  label,
  active,
  children,
}: {
  onClick?: () => void;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    aria-label={label}
    title={label}
    className={cn(
      "flex items-center justify-center rounded-lg sm:rounded-xl",
      "h-10 w-10 sm:h-11 sm:w-11",
      "text-white/70 transition-all duration-200",
      "hover:bg-white/10 hover:text-white active:scale-95",
      active && "text-[#d4b16a] bg-white/5"
    )}
  >
    {children}
  </button>
);

export default function ReaderControls({
  novel,
  onOpenSettings,
  onToggleTts,
  onBookmark,
  onOpenChapters,
  isBookmarked = false,
  isChapterPanelOpen = false,
  ttsState = "idle",
  onPrev,
  onNext,
}: ReaderControlsProps) {
  const isTtsActive = ttsState === "playing" || ttsState === "paused";

  return (
    <div className="sticky top-[60px] sm:top-[90px] z-40">
      <div className="w-full">

        <div className="flex w-full items-center justify-between gap-3 sm:gap-6 border-t border-white/10 bg-[#0b0c10]/80 px-4 sm:px-8 py-3 backdrop-blur-xl shadow-lg shadow-black/30">

          {/* LEFT */}
          <button
            onClick={onPrev}
            className="h-10 sm:h-11 px-3 sm:px-4 text-sm sm:text-base text-white/70 border border-white/10 rounded-lg hover:bg-white/10 transition"
          >
            Prev
          </button>

          {/* CENTER */}
          <div className="flex items-center gap-4 sm:gap-6 flex-1 justify-center">

            <IconBtn onClick={onBookmark} label="Bookmark" active={isBookmarked}>
              <Bookmark size={20} />
            </IconBtn>

            <Link href={`/novel/${novel.id}`}>
              <IconBtn label="Info">
                <Info size={20} />
              </IconBtn>
            </Link>

            <IconBtn onClick={onToggleTts} label="TTS" active={isTtsActive}>
              <Volume2 size={20} />
            </IconBtn>

            <IconBtn onClick={onOpenSettings} label="Settings">
              <Settings size={20} />
            </IconBtn>

            <IconBtn onClick={onOpenChapters} label="Chapters" active={isChapterPanelOpen}>
              <List size={20} />
            </IconBtn>

          </div>

          {/* RIGHT */}
          <button
            onClick={onNext}
            className="h-10 sm:h-11 px-3 sm:px-4 text-sm sm:text-base text-white/70 border border-white/10 rounded-lg hover:bg-white/10 transition"
          >
            Next
          </button>

        </div>
      </div>
    </div>
  );
}