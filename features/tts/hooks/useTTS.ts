"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createTtsSessionManager } from "@/core/tts/session";
import {
  clearTtsResumeState,
  getTtsResumeState,
  saveTtsResumeState,
} from "@/features/tts/repositories/ttsResumeRepository";
import {
  initializeTts,
} from "@/features/tts/services/queries/initializeTts";
import {
  isPaused,
  isSpeaking,
  pause,
  resume,
  speak,
  stop,
} from "@/features/tts/services/runtime/TtsPlayer";
import type { TtsState } from "@/features/tts/types/TtsState";

type TtsReaderSettings = {
  autoNext: boolean;
  autoPlayTts: boolean;
  tts: {
    voiceURI: string;
    rate: number;
    pitch: number;
  };
};

type UseTtsOptions = {
  novelId: string;
  chapterId?: string;
  chapterIndex: number;
  isLoading: boolean;
  hasNovel: boolean;
  content: string[];
  settings: TtsReaderSettings;
  nextHref?: string;
  onAutoNext: (href: string, chapterIndex: number, shouldAutoPlay: boolean) => void;
  onStatusMessage?: (message: string) => void;
};

const AUTOPLAY_STORAGE_KEY = "krvt-reader-autoplay-tts";

export function useTTS({
  novelId,
  chapterId,
  chapterIndex,
  isLoading,
  hasNovel,
  content,
  settings,
  nextHref,
  onAutoNext,
  onStatusMessage,
}: UseTtsOptions) {
  const [ttsState, setTtsState] = useState<TtsState>("idle");
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState<number | null>(null);

  const ttsSessionRef = useRef(createTtsSessionManager());
  const lastPlaybackParagraphIndexRef = useRef<number | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const settingsRef = useRef(settings);
  const nextHrefRef = useRef<string | undefined>(nextHref);
  const autoNextRef = useRef(onAutoNext);
  const statusMessageRef = useRef(onStatusMessage);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    nextHrefRef.current = nextHref;
  }, [nextHref]);

  useEffect(() => {
    autoNextRef.current = onAutoNext;
  }, [onAutoNext]);

  useEffect(() => {
    statusMessageRef.current = onStatusMessage;
  }, [onStatusMessage]);

  useEffect(() => {
    const ttsSession = ttsSessionRef.current;
    return () => {
      if (longPressTimeoutRef.current !== null) {
        clearTimeout(longPressTimeoutRef.current);
      }
      ttsSession.cancel();
      stop();
    };
  }, []);

  useEffect(() => {
    ttsSessionRef.current.cancel();
    stop();
    setTtsState("idle");
    setCurrentParagraphIndex(null);
    lastPlaybackParagraphIndexRef.current = null;
  }, [chapterId]);

  const playParagraph = useCallback(
    async (paragraphIndex: number, runId: number) => {
      const paragraph = content[paragraphIndex]?.trim();
      if (!paragraph) {
        const nextIndex = content.findIndex((line, index) => index > paragraphIndex && line.trim());
        if (nextIndex === -1) {
          setTtsState("idle");
          setCurrentParagraphIndex(null);
          return;
        }
        await playParagraph(nextIndex, runId);
        return;
      }

      ttsSessionRef.current.markParagraph(paragraphIndex);
      lastPlaybackParagraphIndexRef.current = paragraphIndex;
      setCurrentParagraphIndex(paragraphIndex);

      const started = await speak(paragraph, settingsRef.current, {
        onStart: () => {
          if (!ttsSessionRef.current.isCurrent(runId)) return;
          setTtsState("playing");
        },
        onPause: () => setTtsState("paused"),
        onResume: () => setTtsState("playing"),
        onEnd: () => {
          if (!ttsSessionRef.current.isCurrent(runId)) return;
          const nextIndex = content.findIndex((line, index) => index > paragraphIndex && line.trim());
          if (nextIndex !== -1) {
            void playParagraph(nextIndex, runId);
            return;
          }

          setTtsState("idle");
          setCurrentParagraphIndex(null);

          const latestSettings = settingsRef.current;
          const latestNextHref = nextHrefRef.current;
          if (latestSettings.autoNext && latestNextHref) {
            autoNextRef.current(latestNextHref, chapterIndex + 1, latestSettings.autoPlayTts);
          }
        },
        onError: (error) => {
          if (!ttsSessionRef.current.isCurrent(runId) || ttsSessionRef.current.isPauseRequested()) return;
          console.error("Reader TTS paragraph failed", { error, paragraphIndex });
          setTtsState("idle");
          statusMessageRef.current?.("Text-to-speech could not start.");
        },
      });

      if (!started && ttsSessionRef.current.isCurrent(runId) && !ttsSessionRef.current.isPauseRequested()) {
        setTtsState("idle");
      }
    },
    [chapterIndex, content],
  );

  const startFromParagraph = useCallback(
    async (startIndex: number) => {
      if (content.length === 0) {
        statusMessageRef.current?.("There is no chapter text available to read.");
        return;
      }

      const safeStartIndex = Math.min(Math.max(startIndex, 0), content.length - 1);
      lastPlaybackParagraphIndexRef.current = safeStartIndex;
      const runId = ttsSessionRef.current.start(safeStartIndex);
      setTtsState("playing");
      await playParagraph(safeStartIndex, runId);
    },
    [content.length, playParagraph],
  );

  useEffect(() => {
    if (isLoading || !hasNovel || content.length === 0) return;

    let shouldAutoPlay = "";
    try {
      shouldAutoPlay = window.sessionStorage.getItem(AUTOPLAY_STORAGE_KEY) ?? "";
    } catch {
      return;
    }

    if (shouldAutoPlay === "1") {
      window.sessionStorage.removeItem(AUTOPLAY_STORAGE_KEY);
      const timeout = window.setTimeout(() => {
        void startFromParagraph(0);
      }, 0);
      return () => clearTimeout(timeout);
    }

    const resumeState = getTtsResumeState();
    if (resumeState && resumeState.novelId === novelId && resumeState.chapterIndex === chapterIndex) {
      const timeout = window.setTimeout(() => {
        void startFromParagraph(resumeState.paragraphIndex);
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [chapterIndex, content.length, hasNovel, isLoading, novelId, startFromParagraph]);

  useEffect(() => {
    if (ttsState === "playing" && currentParagraphIndex !== null) {
      saveTtsResumeState({
        novelId,
        chapterIndex,
        paragraphIndex: currentParagraphIndex,
        rate: settings.tts.rate,
        voiceURI: settings.tts.voiceURI,
      });
    } else if (ttsState === "stopped") {
      clearTtsResumeState();
    }
  }, [
    chapterIndex,
    currentParagraphIndex,
    novelId,
    settings.tts.rate,
    settings.tts.voiceURI,
    ttsState,
  ]);

  const requestAutoplayOnNavigation = useCallback(() => {
    if (ttsState === "playing" || ttsState === "paused") {
      try {
        window.sessionStorage.setItem(AUTOPLAY_STORAGE_KEY, "1");
      } catch {}
    }
  }, [ttsState]);

  const toggle = useCallback(async () => {
    const ready = await initializeTts();
    if (!ready) {
      statusMessageRef.current?.("Text-to-speech could not start.");
      return;
    }

    if (isSpeaking()) {
      if (isPaused()) {
        resume();
        ttsSessionRef.current.setPauseRequested(false);
        setTtsState("playing");
      } else {
        ttsSessionRef.current.setPauseRequested(true);
        pause();
        setTtsState("paused");
      }
      return;
    }

    if (ttsState === "paused") {
      resume();
      ttsSessionRef.current.setPauseRequested(false);
      setTtsState("playing");
      return;
    }

    await startFromParagraph(
      ttsState === "stopped"
        ? 0
        : currentParagraphIndex ?? lastPlaybackParagraphIndexRef.current ?? 0,
    );
  }, [currentParagraphIndex, startFromParagraph, ttsState]);

  const stopTts = useCallback(() => {
    ttsSessionRef.current.cancel();
    stop();
    lastPlaybackParagraphIndexRef.current = null;
    setTtsState("stopped");
    setCurrentParagraphIndex(null);
    clearTtsResumeState();
  }, []);

  const handleParagraphPointerDown = useCallback(
    (index: number) => {
      if (ttsState !== "playing" && ttsState !== "paused") return;
      if (longPressTimeoutRef.current !== null) clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = window.setTimeout(() => {
        void startFromParagraph(index);
      }, 450);
    },
    [startFromParagraph, ttsState],
  );

  const clearLongPress = useCallback(() => {
    if (longPressTimeoutRef.current !== null) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  return {
    ttsState,
    currentParagraphIndex,
    requestAutoplayOnNavigation,
    toggle,
    stop: stopTts,
    startFromParagraph,
    handleParagraphPointerDown,
    clearLongPress,
  };
}
