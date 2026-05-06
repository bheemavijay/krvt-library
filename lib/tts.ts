"use client";

import type { ReaderSettings } from "@/lib/settings";

export type TtsVoice = SpeechSynthesisVoice;

type SpeakCallbacks = {
  onStart?: () => void;
  onEnd?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onError?: (error: string) => void;
};

let utterance: SpeechSynthesisUtterance | null = null;
let lastCallbacks: SpeakCallbacks = {};
let currentSpeechKey = "";
let voicesCache: TtsVoice[] = [];
let voicesPromise: Promise<TtsVoice[]> | null = null;
let bootPromise: Promise<boolean> | null = null;

const DEFAULT_LANG = "en-US";
const BASE_VOICE_TIMEOUT_MS = 1800;
const ANDROID_VOICE_TIMEOUT_MS = 5000;
const VOICE_POLL_INTERVAL_MS = 250;

function isBrowserWithSpeechApis() {
  return (
    typeof window !== "undefined" &&
    typeof SpeechSynthesisUtterance !== "undefined" &&
    "speechSynthesis" in window
  );
}

function getSpeechSynthesisInstance() {
  if (!isBrowserWithSpeechApis()) {
    return null;
  }

  return window.speechSynthesis ?? null;
}

function isAndroidLikeEnvironment() {
  if (typeof window === "undefined") {
    return false;
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  return userAgent.includes("android") || userAgent.includes("wv;");
}

function voicePriority(voice: SpeechSynthesisVoice) {
  const lang = voice.lang.toLowerCase();

  if (lang.startsWith("en-gb")) return 0;
  if (lang.startsWith("en-us")) return 1;
  if (lang.startsWith("en")) return 2;
  return 3;
}

export function filterVoices(voices: SpeechSynthesisVoice[]) {
  const englishVoices = [...voices]
    .filter((voice) => voice.lang.toLowerCase().startsWith("en"))
    .sort((left, right) => {
      const priorityDifference = voicePriority(left) - voicePriority(right);
      if (priorityDifference !== 0) {
        return priorityDifference;
      }
      return left.name.localeCompare(right.name);
    });

  return englishVoices.length > 0 ? englishVoices : [...voices];
}

export async function initializeTts() {
  if (bootPromise) {
    return bootPromise;
  }

  bootPromise = (async () => {
    const startedAt = Date.now();
    const timeoutMs = isAndroidLikeEnvironment() ? ANDROID_VOICE_TIMEOUT_MS : BASE_VOICE_TIMEOUT_MS;

    while (Date.now() - startedAt < timeoutMs) {
      const synth = getSpeechSynthesisInstance();
      if (synth) {
        try {
          synth.getVoices();
        } catch {
          // Keep polling until the WebView finishes exposing the API.
        }
        return true;
      }

      await wait(VOICE_POLL_INTERVAL_MS);
    }

    return getSpeechSynthesisInstance() !== null;
  })();

  const ready = await bootPromise;
  bootPromise = null;
  return ready;
}

export async function loadVoices(forceRefresh = false): Promise<TtsVoice[]> {
  if (!forceRefresh && voicesCache.length > 0) {
    return voicesCache;
  }

  if (!forceRefresh && voicesPromise) {
    return voicesPromise;
  }

  voicesPromise = (async () => {
    const ready = await initializeTts();
    if (!ready) {
      return [];
    }

    const synth = getSpeechSynthesisInstance();
    if (!synth) {
      return [];
    }

    const startedAt = Date.now();
    const timeoutMs = isAndroidLikeEnvironment() ? ANDROID_VOICE_TIMEOUT_MS : BASE_VOICE_TIMEOUT_MS;

    return await new Promise<TtsVoice[]>((resolve) => {
      let settled = false;
      let intervalId: number | undefined;
      let timeoutId: number | undefined;

      const finish = (voices: TtsVoice[]) => {
        if (settled) {
          return;
        }

        settled = true;
        if (intervalId !== undefined) {
          window.clearInterval(intervalId);
        }
        if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId);
        }
        synth.removeEventListener("voiceschanged", handleVoicesChanged);
        voicesCache = filterVoices(voices);
        resolve(voicesCache);
      };

      const readVoices = () => {
        try {
          return synth.getVoices();
        } catch {
          return [];
        }
      };

      const maybeFinish = () => {
        const available = readVoices();
        if (available.length > 0) {
          finish(available);
        }
      };

      const handleVoicesChanged = () => {
        maybeFinish();
      };

      synth.addEventListener("voiceschanged", handleVoicesChanged);

      maybeFinish();

      if (settled) {
        return;
      }

      intervalId = window.setInterval(() => {
        maybeFinish();
        if (!settled && Date.now() - startedAt >= timeoutMs) {
          finish(readVoices());
        }
      }, VOICE_POLL_INTERVAL_MS);

      timeoutId = window.setTimeout(() => {
        finish(readVoices());
      }, timeoutMs + 150);
    });
  })();

  const resolved = await voicesPromise;
  voicesPromise = null;
  return resolved;
}

export async function speak(
  text: string | string[],
  settings: ReaderSettings,
  callbacks: SpeakCallbacks = {},
) {
  const ready = await initializeTts();
  if (!ready) {
    callbacks.onError?.("Speech synthesis is not available yet. Please try again in a moment.");
    return false;
  }

  const synth = getSpeechSynthesisInstance();
  if (!synth) {
    callbacks.onError?.(
      typeof window !== "undefined" && typeof window.speechSynthesis === "undefined"
        ? "Speech synthesis is not supported in this browser."
        : "Speech synthesis is not available yet. Please try again in a moment.",
    );
    return false;
  }

  const content = Array.isArray(text) ? text.join("\n\n") : text;
  const normalizedText = content.trim();
  const speechKey = JSON.stringify({
    text: normalizedText,
    voiceURI: settings.tts.voiceURI,
    rate: settings.tts.rate,
    pitch: settings.tts.pitch,
  });

  if (!normalizedText) {
    callbacks.onError?.("There is no chapter text available to read.");
    return false;
  }

  if (utterance && currentSpeechKey === speechKey) {
    lastCallbacks = callbacks;
    if (synth.paused) {
      synth.resume();
    }
    return true;
  }

  if (utterance) {
    synth.cancel();
    utterance = null;
  }

  const voices = await loadVoices();
  const nextUtterance = new SpeechSynthesisUtterance(normalizedText);
  const selectedVoice =
    voices.find((voice) => voice.voiceURI === settings.tts.voiceURI) ??
    voices[0] ??
    null;

  if (selectedVoice) {
    nextUtterance.voice = selectedVoice;
    nextUtterance.lang = selectedVoice.lang || DEFAULT_LANG;
  } else {
    nextUtterance.lang = DEFAULT_LANG;
  }

  nextUtterance.rate = settings.tts.rate;
  nextUtterance.pitch = settings.tts.pitch;
  nextUtterance.onstart = () => callbacks.onStart?.();
  nextUtterance.onpause = () => callbacks.onPause?.();
  nextUtterance.onresume = () => callbacks.onResume?.();
  nextUtterance.onend = () => {
    utterance = null;
    currentSpeechKey = "";
    lastCallbacks = {};
    callbacks.onEnd?.();
  };
  nextUtterance.onerror = (event) => {
    utterance = null;
    currentSpeechKey = "";
    lastCallbacks = {};

    if (event.error !== "interrupted" && event.error !== "canceled") {
      callbacks.onError?.(event.error);
    }
  };

  utterance = nextUtterance;
  currentSpeechKey = speechKey;
  lastCallbacks = callbacks;

  if (synth.paused) {
    synth.resume();
  }

  synth.speak(nextUtterance);
  return true;
}

export function pause() {
  const synth = getSpeechSynthesisInstance();
  if (!synth) {
    return;
  }

  if (synth.speaking) {
    synth.pause();
  }
  lastCallbacks.onPause?.();
}

export function resume() {
  const synth = getSpeechSynthesisInstance();
  if (!synth) {
    return;
  }

  if (synth.paused) {
    synth.resume();
  }
  lastCallbacks.onResume?.();
}

export function stop() {
  const synth = getSpeechSynthesisInstance();
  if (!synth) {
    return;
  }

  synth.cancel();
  utterance = null;
  currentSpeechKey = "";
  lastCallbacks = {};
}

export function isSpeaking() {
  const synth = getSpeechSynthesisInstance();
  return synth ? synth.speaking : false;
}

export function isPaused() {
  const synth = getSpeechSynthesisInstance();
  return synth ? synth.paused : false;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
