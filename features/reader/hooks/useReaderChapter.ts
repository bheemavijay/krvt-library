import { useMemo } from "react";
import type { CSSProperties } from "react";

import { getReaderFontStack } from "@/features/reader/services/readerSettingsService";
import type { ReaderSettings, ReplacementRule } from "@/features/reader/types/ReaderSettings";
import type { TtsState } from "@/features/tts";
import type { Chapter, Novel } from "@/shared/types";

export function useReaderChapter({
  novel,
  chapter,
  chapterSearch,
  currentChapterIndex,
  currentParagraphIndex,
  settings,
  ttsState,
}: {
  novel: Novel | null;
  chapter: Chapter | null;
  chapterSearch: string;
  currentChapterIndex: number;
  currentParagraphIndex: number | null;
  settings: ReaderSettings;
  ttsState: TtsState;
}) {
  const totalChapters = novel?.chapters.length ?? 0;
  const nextHref =
    novel && currentChapterIndex < novel.chapters.length - 1
      ? `/reader?id=${novel.id}&chapter=${currentChapterIndex + 2}`
      : undefined;
  const previousHref =
    novel && currentChapterIndex > 0
      ? `/reader?id=${novel.id}&chapter=${currentChapterIndex}`
      : undefined;
  const progressPercent =
    totalChapters > 0 ? Math.round(((currentChapterIndex + 1) / totalChapters) * 100) : 0;
  const textAlign = settings.textAlign as CSSProperties["textAlign"];
  const readerMaxWidth = settings.contentMaxWidth >= 9999 ? "100%" : `${settings.contentMaxWidth}px`;
  const readerFontFamily = getReaderFontStack(settings.fontFamily);

  const normalizedContent = useMemo(() => {
    if (!chapter) return [];
    const content = Array.isArray(chapter.content)
      ? chapter.content.filter(Boolean)
      : String(chapter.content ?? "")
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean);
    return applyTermReplacements(content, settings.replacements);
  }, [chapter, settings.replacements]);

  const paragraphProgressPercent =
    currentParagraphIndex !== null && normalizedContent.length > 0
      ? Math.round(((currentParagraphIndex + 1) / normalizedContent.length) * 100)
      : 0;

  const filteredChapters = useMemo(() => {
    const query = chapterSearch.trim().toLowerCase();
    return (novel?.chapters ?? []).map((item, index) => ({ item, index })).filter(({ item, index }) => {
      if (!query) return true;
      return String(index + 1).includes(query) || item.title.toLowerCase().includes(query);
    });
  }, [chapterSearch, novel?.chapters]);

  return {
    filteredChapters,
    navButtonClass:
      "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/70 transition-all duration-150 hover:border-white/20 hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-30",
    nextHref,
    normalizedContent,
    paragraphProgressPercent,
    previousHref,
    progressPercent,
    readerFontFamily,
    readerMaxWidth,
    textAlign,
    totalChapters,
    isParagraphHighlighted: (index: number) =>
      settings.paragraphHighlight &&
      currentParagraphIndex === index &&
      (ttsState === "playing" || ttsState === "paused"),
  };
}

export function formatChapterIndexTitle(title: string, index: number) {
  const trimmed = title.trim();
  return trimmed || `Chapter ${index + 1}`;
}

function applyTermReplacements(content: string[], replacements: ReplacementRule[]) {
  return content.map((line) => {
    let result = line.replace(/&quot;/gi, '"').replace(/&nbsp;/gi, " ").replace(/&#39;/gi, "'").replace(/\s{2,}/g, " ").replace(/\(To be continued.*?\)/gi, "").trim();
    for (const rule of replacements) {
      if (!rule.find) continue;
      try {
        result = result.replace(createReplacementRegex(rule), rule.replace || "");
      } catch {
        result = replaceWithoutRegex(result, rule);
      }
    }
    return result;
  });
}

function createReplacementRegex(rule: ReplacementRule) {
  const baseFlags = rule.caseSensitive ? "g" : "gi";
  if (!rule.isRegex) return new RegExp(escapeRegex(rule.find), baseFlags);
  return new RegExp(rule.find, baseFlags);
}

function replaceWithoutRegex(value: string, rule: ReplacementRule) {
  if (rule.caseSensitive) return value.split(rule.find).join(rule.replace || "");
  const lowerFind = rule.find.toLowerCase();
  let nextValue = value;
  let index = nextValue.toLowerCase().indexOf(lowerFind);
  while (index !== -1) {
    nextValue = nextValue.slice(0, index) + (rule.replace || "") + nextValue.slice(index + rule.find.length);
    index = nextValue.toLowerCase().indexOf(lowerFind, index + (rule.replace || "").length);
  }
  return nextValue;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
