"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Bookmark,
  Info,
  Volume2,
  Settings,
  List,
} from "lucide-react";

type ReaderControlsProps = {
  novel: {
    id: string;
    title: string;
    chapters: Array<unknown>;
  };
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
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={cn(
      "flex h-11 w-11 items-center justify-center rounded-xl text-white/70 transition-all duration-200",
      "hover:bg-white/10 hover:text-white active:scale-95",
      "shadow-[0_0_10px_rgba(255,255,255,0.05)]",
      active && "text-[#d4b16a] bg-white/5"
    )}
  >
    {children}
  </button>
);

const IconLinkBtn = ({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) => (
  <Link
    href={href}
    aria-label={label}
    title={label}
    className="flex h-11 w-11 items-center justify-center rounded-xl text-white/70 transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-95"
  >
    {children}
  </Link>
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
    <div className="sticky top-[92px] z-40 mb-6">
      <div className="w-full px-2 sm:px-4">

        <div className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#0b0c10]/80 px-6 py-3 shadow-lg backdrop-blur-xl">

          {/* LEFT: PREV */}
          <button
            onClick={onPrev}
            className="px-4 py-2 text-white/70 border border-white/10 rounded-lg hover:bg-white/10 transition"
          >
            <span className="text-lg font-medium tracking-wide">Prev</span>
          </button>

          {/* CENTER ICONS */}
          <div className="flex items-center gap-8">

            <IconBtn onClick={onBookmark} label="Bookmark" active={isBookmarked}>
              <Bookmark size={20} strokeWidth={2} />
            </IconBtn>

            <IconLinkBtn href={`/novel/${novel.id}`} label="Info">
              <Info size={20} strokeWidth={2} />
            </IconLinkBtn>

            <IconBtn onClick={onToggleTts} label="TTS" active={isTtsActive}>
              <Volume2 size={20} strokeWidth={2} />
            </IconBtn>

            <IconBtn onClick={onOpenSettings} label="Settings">
              <Settings size={20} strokeWidth={2} />
            </IconBtn>

            <IconBtn onClick={onOpenChapters} label="Chapters" active={isChapterPanelOpen}>
              <List size={20} strokeWidth={2} />
            </IconBtn>

          </div>

          {/* RIGHT: NEXT */}
          <button
            onClick={onNext}
            className="px-4 py-2 text-white/70 border border-white/10 rounded-lg hover:bg-white/10 transition"
          >
            <span className="text-lg font-medium tracking-wide">Next</span>
          </button>

        </div>
      </div>
    </div>
  );
}