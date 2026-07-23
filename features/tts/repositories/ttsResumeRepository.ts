"use client";

export type TtsResumeState = {
  novelId: string;
  chapterIndex: number;
  paragraphIndex: number;
  rate: number;
  voiceURI: string;
  updatedAt: number;
};

const TTS_RESUME_KEY = "krvt-tts-resume-state";

export function saveTtsResumeState(state: Omit<TtsResumeState, "updatedAt">) {
  try {
    const payload: TtsResumeState = {
      ...state,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(TTS_RESUME_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Failed to save TTS resume state", error);
  }
}

export function getTtsResumeState(): TtsResumeState | null {
  try {
    const stored = window.localStorage.getItem(TTS_RESUME_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as Partial<TtsResumeState>;
    if (
      typeof parsed.novelId !== "string" ||
      typeof parsed.chapterIndex !== "number" ||
      typeof parsed.paragraphIndex !== "number" ||
      typeof parsed.updatedAt !== "number"
    ) {
      return null;
    }

    // Do not resume if the state is more than 2 hours old
    if (Date.now() - parsed.updatedAt > 2 * 60 * 60 * 1000) {
      return null;
    }

    return {
      novelId: parsed.novelId,
      chapterIndex: parsed.chapterIndex,
      paragraphIndex: parsed.paragraphIndex,
      rate: parsed.rate ?? 1,
      voiceURI: parsed.voiceURI ?? "",
      updatedAt: parsed.updatedAt,
    };
  } catch (error) {
    console.warn("Failed to retrieve TTS resume state", error);
    return null;
  }
}

export function clearTtsResumeState() {
  try {
    window.localStorage.removeItem(TTS_RESUME_KEY);
  } catch (error) {
    console.warn("Failed to clear TTS resume state", error);
  }
}
