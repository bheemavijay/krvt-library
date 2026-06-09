"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";
import type { ReaderSettings } from "@/lib/settings";

export type TtsVoice = {
  voiceURI: string;
  name: string;
  lang: string;
  localService?: boolean;
  default?: boolean;
  voiceIndex?: number;
  category?: string;
  nativeVoice?: SpeechSynthesisVoice;
};

type SpeakCallbacks = {
  onStart?: () => void;
  onEnd?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onError?: (error: string) => void;
};

type NativeTextToSpeechPlugin = {
  speak(options: {
    text: string;
    lang?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
    voice?: number;
    queueStrategy?: number;
  }): Promise<void>;
  stop(): Promise<void>;
  getSupportedVoices?: () => Promise<{ voices: SpeechSynthesisVoice[] }>;
};

const NativeTextToSpeech = registerPlugin<NativeTextToSpeechPlugin>("TextToSpeech");

let utterance: SpeechSynthesisUtterance | null = null;
let lastCallbacks: SpeakCallbacks = {};
let currentSpeechKey = "";
let voicesCache: TtsVoice[] = [];
let voicesPromise: Promise<TtsVoice[]> | null = null;
let bootPromise: Promise<boolean> | null = null;
let nativeSpeaking = false;
let nativePaused = false;
let speakRunId = 0;

const DEFAULT_LANG = "en-US";
const BASE_VOICE_TIMEOUT_MS = 1800;
const ANDROID_VOICE_TIMEOUT_MS = 5000;
const VOICE_POLL_INTERVAL_MS = 250;
const MAX_NATIVE_CHUNK_LENGTH = 3000;

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

function isNativeTtsEnvironment() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

function isAndroidLikeEnvironment() {
  if (typeof window === "undefined") {
    return false;
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  return userAgent.includes("android") || userAgent.includes("wv;");
}

function voicePriority(voice: SpeechSynthesisVoice | TtsVoice) {
  const lang = voice.lang.toLowerCase();

  if (lang.startsWith("en-gb")) return 0;
  if (lang.startsWith("en-us")) return 1;
  if (lang.startsWith("en")) return 2;
  return 3;
}

export function filterVoices(voices: Array<SpeechSynthesisVoice | TtsVoice>) {
  const seen = new Set<string>();
  const normalizedVoices = voices.map(normalizeVoice).filter((voice) => {
    if (isAndroidLikeEnvironment() && !voice.lang.toLowerCase().startsWith("en")) {
      return false;
    }

    const key = [
      normalizeVoiceIdentity(voice.voiceURI),
      normalizeVoiceIdentity(voice.lang),
      normalizeVoiceIdentity(voice.name),
    ].join("|");
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  return [...normalizedVoices].sort((left, right) => {
      const priorityDifference = voicePriority(left) - voicePriority(right);
      if (priorityDifference !== 0) {
        return priorityDifference;
      }
      if (left.category !== right.category) {
        return (left.category ?? "").localeCompare(right.category ?? "");
      }
      return left.name.localeCompare(right.name);
    });
}

export async function initializeTts() {
  if (bootPromise) {
    return bootPromise;
  }

  bootPromise = (async () => {
    const startedAt = Date.now();
    const timeoutMs = isAndroidLikeEnvironment() ? ANDROID_VOICE_TIMEOUT_MS : BASE_VOICE_TIMEOUT_MS;

    if (isNativeTtsEnvironment()) {
      return true;
    }

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

  if (isNativeTtsEnvironment()) {
    try {
      const result = await NativeTextToSpeech.getSupportedVoices?.();
      const nativeVoices = (result?.voices ?? []).map((voice, index) => ({
        ...voice,
        voiceIndex: index,
      }));

      voicesCache = [getDefaultNativeVoice(), ...filterVoices(nativeVoices)];
      return voicesCache;
    } catch (error) {
      console.warn("TextToSpeech.getSupportedVoices failed", error);
      voicesCache = [getDefaultNativeVoice()];
      return voicesCache;
    }
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

      const finish = (voices: Array<SpeechSynthesisVoice | TtsVoice>) => {
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
  const content = Array.isArray(text) ? text.join("\n\n") : text;
  const normalizedText = content.trim();

  if (!normalizedText) {
    callbacks.onError?.("There is no chapter text available to read.");
    return false;
  }

  const ready = await initializeTts();
  if (!ready) {
    callbacks.onError?.("Speech synthesis is not available yet. Please try again in a moment.");
    return false;
  }

  if (isNativeTtsEnvironment()) {
    return speakWithNativeTts(normalizedText, settings, callbacks);
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

  const speechKey = JSON.stringify({
    text: normalizedText,
    voiceURI: settings.tts.voiceURI,
    rate: settings.tts.rate,
    pitch: settings.tts.pitch,
  });

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

  const voices = await loadVoices(true);
  const nextUtterance = new SpeechSynthesisUtterance(normalizedText);
  const selectedVoice = findSpeakableWebVoice(voices, settings.tts.voiceURI);

  nextUtterance.lang = normalizeLocale(selectedVoice?.lang);
  if (selectedVoice?.nativeVoice) {
    try {
      nextUtterance.voice = selectedVoice.nativeVoice;
    } catch (error) {
      console.warn("Ignoring unavailable TTS voice", {
        voiceURI: selectedVoice.voiceURI,
        name: selectedVoice.name,
        error,
      });
      nextUtterance.lang = DEFAULT_LANG;
    }
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
      console.error("TextToSpeech.speak failed", {
        engine: "web",
        error: event.error,
        textLength: normalizedText.length,
        lang: nextUtterance.lang,
        rate: nextUtterance.rate,
        pitch: nextUtterance.pitch,
      });
      callbacks.onError?.(event.error);
    }
  };

  utterance = nextUtterance;
  currentSpeechKey = speechKey;
  lastCallbacks = callbacks;

  if (synth.paused) {
    synth.resume();
  }

  try {
    synth.speak(nextUtterance);
    return true;
  } catch (error) {
    utterance = null;
    currentSpeechKey = "";
    lastCallbacks = {};
    console.error("TextToSpeech.speak failed", {
      engine: "web",
      error,
      textLength: normalizedText.length,
      lang: nextUtterance.lang,
      rate: nextUtterance.rate,
      pitch: nextUtterance.pitch,
    });
    callbacks.onError?.("Text to speech could not start.");
    return false;
  }
}

export function pause() {
  if (isNativeTtsEnvironment()) {
    speakRunId += 1;
    const callbacks = lastCallbacks;
    void stopNativeSpeech(true);
    nativePaused = true;
    callbacks.onPause?.();
    return;
  }

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
  if (isNativeTtsEnvironment()) {
    lastCallbacks.onResume?.();
    return;
  }

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
  speakRunId += 1;

  if (isNativeTtsEnvironment()) {
    void stopNativeSpeech();
    return;
  }

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
  if (isNativeTtsEnvironment()) {
    return nativeSpeaking;
  }

  const synth = getSpeechSynthesisInstance();
  return synth ? synth.speaking : false;
}

export function isPaused() {
  if (isNativeTtsEnvironment()) {
    return nativePaused;
  }

  const synth = getSpeechSynthesisInstance();
  return synth ? synth.paused : false;
}

async function speakWithNativeTts(
  normalizedText: string,
  settings: ReaderSettings,
  callbacks: SpeakCallbacks,
) {
  const runId = speakRunId + 1;
  speakRunId = runId;
  await stopNativeSpeech();

  const chunks = chunkText(normalizedText, MAX_NATIVE_CHUNK_LENGTH);
  if (chunks.length === 0) {
    callbacks.onError?.("There is no chapter text available to read.");
    return false;
  }

  nativeSpeaking = true;
  nativePaused = false;
  currentSpeechKey = JSON.stringify({
    text: normalizedText,
    voiceURI: settings.tts.voiceURI,
    rate: settings.tts.rate,
    pitch: settings.tts.pitch,
  });
  lastCallbacks = callbacks;
  callbacks.onStart?.();

  try {
    const voices = await loadVoices();
    const selectedVoice = voices.find((voice) => voice.voiceURI === settings.tts.voiceURI) ?? null;
    const selectedVoiceIndex =
      typeof selectedVoice?.voiceIndex === "number" ? selectedVoice.voiceIndex : undefined;
    const selectedLang = normalizeLocale(selectedVoice?.lang);

    for (const [index, chunk] of chunks.entries()) {
      if (runId !== speakRunId) {
        return false;
      }

      await NativeTextToSpeech.speak({
        text: chunk,
        lang: selectedLang,
        rate: clampSpeechNumber(settings.tts.rate, 0.1, 2, 1),
        pitch: clampSpeechNumber(settings.tts.pitch, 0.1, 2, 1),
        volume: 1,
        queueStrategy: 1,
        ...(selectedVoiceIndex !== undefined ? { voice: selectedVoiceIndex } : {}),
      });

      if (runId !== speakRunId) {
        return false;
      }

      if (index < chunks.length - 1) {
        await wait(80);
      }
    }

    clearSpeechState();
    callbacks.onEnd?.();
    return true;
  } catch (error) {
    clearSpeechState();
    console.error("TextToSpeech.speak failed", {
      engine: "native",
      error,
      textLength: normalizedText.length,
      chunkCount: chunks.length,
      lang: DEFAULT_LANG,
      rate: settings.tts.rate,
      pitch: settings.tts.pitch,
    });
    callbacks.onError?.("Text to speech could not start.");
    return false;
  }
}

async function stopNativeSpeech(keepPaused = false) {
  try {
    await NativeTextToSpeech.stop();
  } catch (error) {
    console.warn("TextToSpeech.stop failed", error);
  } finally {
    nativeSpeaking = false;
    nativePaused = keepPaused;
    clearSpeechState();
  }
}

function clearSpeechState() {
  utterance = null;
  currentSpeechKey = "";
  lastCallbacks = {};
  nativeSpeaking = false;
}

function normalizeLocale(value: string | undefined) {
  const locale = (value || DEFAULT_LANG).replace(/_/g, "-");
  try {
    return Intl.getCanonicalLocales(locale)[0] || DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

function getDefaultNativeVoice(): TtsVoice {
  return {
    default: true,
    lang: DEFAULT_LANG,
    localService: true,
    name: "Device Default Voice",
    voiceURI: "native-default",
    category: "System",
  };
}

function normalizeVoice(voice: SpeechSynthesisVoice | TtsVoice): TtsVoice {
  const nativeVoice =
    "voiceIndex" in voice || "nativeVoice" in voice ? voice.nativeVoice : (voice as SpeechSynthesisVoice);
  const category = getVoiceCategory(voice);

  return {
    voiceURI: String(voice.voiceURI || voice.name || voice.lang || DEFAULT_LANG),
    name: cleanVoiceName(String(voice.name || voice.voiceURI || "Default voice")),
    lang: normalizeLocale(voice.lang),
    localService: voice.localService,
    default: voice.default,
    voiceIndex: "voiceIndex" in voice ? voice.voiceIndex : undefined,
    category,
    nativeVoice,
  };
}

function cleanVoiceName(value: string) {
  return value
    .replace(/\s*\([^)]*(?:English|United States|United Kingdom|India|Australia)[^)]*\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeVoiceIdentity(value: string) {
  return cleanVoiceName(value)
    .replace(/[_\s]+/g, "-")
    .toLowerCase()
    .trim();
}

function findSpeakableWebVoice(voices: TtsVoice[], voiceURI: string) {
  const selectedVoice = voices.find((voice) => voice.voiceURI === voiceURI);
  if (isValidWebVoice(selectedVoice)) {
    return selectedVoice;
  }

  const defaultVoice = voices.find((voice) => voice.default && isValidWebVoice(voice));
  if (defaultVoice) {
    return defaultVoice;
  }

  return voices.find(isValidWebVoice) ?? null;
}

function isValidWebVoice(voice: TtsVoice | undefined): voice is TtsVoice & { nativeVoice: SpeechSynthesisVoice } {
  return Boolean(
    voice?.nativeVoice &&
      typeof voice.nativeVoice.name === "string" &&
      typeof voice.nativeVoice.lang === "string",
  );
}

function getVoiceCategory(voice: SpeechSynthesisVoice | TtsVoice) {
  const lang = normalizeLocale(voice.lang);
  if (lang.startsWith("en-US")) return "English - US";
  if (lang.startsWith("en-GB")) return "English - UK";
  if (lang.startsWith("en-AU")) return "English - AU";
  if (lang.startsWith("en-IN")) return "English - India";
  if (lang.startsWith("en")) return "English";
  return lang || "Other";
}

function chunkText(text: string, maxLength: number) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current.trim()) {
      chunks.push(current.trim());
      current = "";
    }
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxLength) {
      pushCurrent();
      chunks.push(...splitLongText(paragraph, maxLength));
      continue;
    }

    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length > maxLength) {
      pushCurrent();
      current = paragraph;
    } else {
      current = next;
    }
  }

  pushCurrent();
  return chunks;
}

function splitLongText(text: string, maxLength: number) {
  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > maxLength) {
    const slice = remaining.slice(0, maxLength);
    const splitAt = Math.max(
      slice.lastIndexOf(". "),
      slice.lastIndexOf("? "),
      slice.lastIndexOf("! "),
      slice.lastIndexOf(", "),
      slice.lastIndexOf(" "),
    );
    const safeSplitAt = splitAt > maxLength * 0.5 ? splitAt + 1 : maxLength;
    chunks.push(remaining.slice(0, safeSplitAt).trim());
    remaining = remaining.slice(safeSplitAt).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}

function clampSpeechNumber(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(value, min), max);
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
