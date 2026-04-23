"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { BottomNav } from "@/components/reader/bottom-nav";
import ReaderControls from "@/components/reader/reader-controls";
import { SettingsModal } from "@/components/reader/settings-modal";
import {
  saveSettings,
  useReaderSettings,
  type ReaderSettings,
} from "@/lib/settings";
import { getNovel } from "@/lib/storage/indexeddb";
import {
  isPaused,
  isSpeaking,
  pause,
  resume,
  speak,
  stop,
} from "@/lib/tts";
import {
  isChapterBookmarked,
  saveNovelBookmark,
  getNovelBookmarks,
  subscribeToBookmarks,
} from "@/lib/storage/bookmarks";

type ReaderNovel = {
  id: string;
  title: string;
  author?: string;
  chapters: Array<{
    id?: string;
    title: string;
    content: string[] | string;
  }>;
};

type Props = {
  novelId: string;
  chapterParam: string;
};

export function ReaderPageClient({ novelId, chapterParam }: Props) {
  const settings = useReaderSettings();

  const [novel, setNovel] = useState<ReaderNovel | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [ttsState, setTtsState] = useState<"idle" | "playing" | "paused">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [bookmarked, setBookmarked] = useState(false);

  const progressKey = `progress_${novelId}`;

  // ✅ SAFE chapterIndex (before hooks)
  let chapterIndex = Number(chapterParam) - 1;
  if (isNaN(chapterIndex) || chapterIndex < 0) chapterIndex = 0;

  // 🔥 LOAD NOVEL + RESTORE SCROLL
  useEffect(() => {
    let isCancelled = false;

    async function load() {
      const data = (await getNovel(novelId)) as ReaderNovel | null;

      if (!isCancelled) {
        setNovel(data);
        setLoading(false);

        // ✅ Restore scroll
        setTimeout(() => {
          try {
            const saved = localStorage.getItem(progressKey);
            if (saved) {
              const { chapterIndex: savedChapter, scrollY } = JSON.parse(saved);

              if (savedChapter === Number(chapterParam) - 1) {
                window.scrollTo(0, scrollY || 0);
              }
            }
          } catch {}
        }, 100);
      }
    }

    load();

    return () => {
      isCancelled = true;
    };
  }, [novelId, chapterParam]);

  // 🔥 STOP TTS ON UNMOUNT
  useEffect(() => {
    return () => stop();
  }, []);

  // 🔥 SAVE PROGRESS (SCROLL)
  useEffect(() => {
    let timeout: any;

    function handleScroll() {
      clearTimeout(timeout);

      timeout = setTimeout(() => {
        try {
          localStorage.setItem(
            progressKey,
            JSON.stringify({
              chapterIndex,
              scrollY: window.scrollY,
            })
          );
        } catch {}
      }, 300);
    }

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, [chapterIndex, novelId]);

    useEffect(() => {
      if (!novel) return;

      function update() {
        const isMarked = isChapterBookmarked(novel.id, chapterIndex);
        setBookmarked(isMarked);
      }

      update();

      return subscribeToBookmarks(update);
    }, [novel, chapterIndex]);

  // 🔒 render guards
  if (loading) return <p className="p-6">Loading...</p>;
  if (!novel) return <p className="p-6 text-red-400">Novel not found ❌</p>;

  // ✅ now safe to validate with novel
  if (chapterIndex >= novel.chapters.length) {
    chapterIndex = novel.chapters.length - 1;
  }

  const chapter = novel.chapters[chapterIndex];

  if (!chapter) {
    return <div className="p-6">Chapter not found ❌</div>;
  }

  // 🔥 NORMALIZE CONTENT
  const normalizedContent = Array.isArray(chapter.content)
    ? chapter.content.filter(Boolean)
    : String(chapter.content ?? "")
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);

  const chapterText = normalizedContent.join("\n\n");

  const previousHref =
    chapterIndex > 0 ? `/novel/${novel.id}/${chapterIndex}` : undefined;

  const nextHref =
    chapterIndex < novel.chapters.length - 1
      ? `/novel/${novel.id}/${chapterIndex + 2}`
      : undefined;

  // 🔥 TTS
  const handleToggleTts = async () => {
    if (isSpeaking()) {
      if (isPaused()) {
        resume();
        setTtsState("playing");
      } else {
        pause();
        setTtsState("paused");
      }
      return;
    }

    const started = await speak(chapterText, settings, {
      onStart: () => setTtsState("playing"),
      onPause: () => setTtsState("paused"),
      onResume: () => setTtsState("playing"),
      onEnd: () => setTtsState("idle"),
      onError: () => setTtsState("idle"),
    });

    if (!started) setTtsState("idle");
  };

  const handleSettingsChange = (next: ReaderSettings) => {
    saveSettings(next);
  };

  const handleBookmark = () => {
    if (!novel) return;

    const result = saveNovelBookmark(
      novel.id,
      chapterIndex,
      chapter.title
    );

    setStatusMessage(
      result.added ? "📌 Bookmarked!" : "Already bookmarked"
    );
  };

  return (
    <>
      <ReaderControls
        novel={novel}
        chapterIndex={chapterIndex}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleTts={handleToggleTts}
        onBookmark={handleBookmark}
        onOpenChapters={() => {
          console.log("open chapters");
        }}
        isBookmarked={bookmarked}
      />

      <main
        className="min-h-screen pb-28 pt-24"
        style={{
          backgroundColor: settings.backgroundColor,
          color: settings.textColor,
        }}
      >
        <div className="w-full px-2 md:px-6 lg:px-12">
          <div className="mb-6 flex justify-between">
            <Link href={`/novel/${novel.id}`} className="text-sm text-white/70">
              ← Back
            </Link>

            <span className="text-xs text-white/50">
              Chapter {chapterIndex + 1} / {novel.chapters.length}
            </span>
          </div>

          <article
            className="w-full px-2 md:px-4 lg:px-6 py-6"
            style={{
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineHeight,
              fontFamily: settings.fontFamily,
            }}
          >
            <h1 className="text-2xl font-bold mb-6">
              Chapter {chapterIndex + 1}: {chapter.title}
            </h1>

            {normalizedContent.map((line, i) => (
              <p key={i} className="mb-5 leading-8 tracking-wide">
                {line}
              </p>
            ))}
          </article>
        </div>
      </main>

      <BottomNav previousHref={previousHref} nextHref={nextHref} />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onChange={handleSettingsChange}
      />
    </>
  );
}