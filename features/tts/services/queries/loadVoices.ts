// This service is responsible for loading and caching available TTS voices.

import { Capacitor } from "@capacitor/core";
import { initializeTts } from "./initializeTts";
import { getSupportedNativeVoices } from "@/features/tts/repositories/nativeTextToSpeechRepository";
import type { TtsVoice } from "../../types/TtsVoice";

let voicesCache: TtsVoice[] = [];
let voicesPromise: Promise<TtsVoice[]> | null = null;

const DEFAULT_LANG = "en-US";
const BASE_VOICE_TIMEOUT_MS = 1800;
const ANDROID_VOICE_TIMEOUT_MS = 5000;
const VOICE_POLL_INTERVAL_MS = 250;

function isAndroidLikeEnvironment() {
  if (typeof window === "undefined") return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return userAgent.includes("android") || userAgent.includes("wv;");
}

function normalizeLocale(value: string | undefined) {
  const locale = (value || DEFAULT_LANG).replace(/_/g, "-");
  try {
    return Intl.getCanonicalLocales(locale)[0] || DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

function cleanVoiceName(value: string) {
  return value.replace(/\s*\([^)]*(?:English|United States|United Kingdom|India|Australia)[^)]*\)\s*/gi, " ").replace(/\s+/g, " ").trim();
}

function normalizeVoiceIdentity(value: string) {
  return cleanVoiceName(value).replace(/[_\s]+/g, "-").toLowerCase().trim();
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

function normalizeVoice(voice: SpeechSynthesisVoice | TtsVoice): TtsVoice {
  const nativeVoice = "voiceIndex" in voice || "nativeVoice" in voice ? voice.nativeVoice : (voice as SpeechSynthesisVoice);
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
    if (isAndroidLikeEnvironment() && !voice.lang.toLowerCase().startsWith("en")) return false;
    const key = [normalizeVoiceIdentity(voice.voiceURI), normalizeVoiceIdentity(voice.lang), normalizeVoiceIdentity(voice.name)].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...normalizedVoices].sort((left, right) => {
    const priorityDifference = voicePriority(left) - voicePriority(right);
    if (priorityDifference !== 0) return priorityDifference;
    if (left.category !== right.category) return (left.category ?? "").localeCompare(right.category ?? "");
    return left.name.localeCompare(right.name);
  });
}

function getDefaultNativeVoice(): TtsVoice {
  return {
    default: true, lang: DEFAULT_LANG, localService: true,
    name: "Device Default Voice", voiceURI: "native-default", category: "System",
  };
}
export async function loadVoices(forceRefresh = false): Promise<TtsVoice[]> {
  if (!forceRefresh && voicesCache.length > 0) {
    return voicesCache;
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const result = await getSupportedNativeVoices();
      const nativeVoices = (result?.voices ?? []).map((voice, index) => ({ ...voice, voiceIndex: index }));
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
    if (!ready || typeof window === "undefined" || !("speechSynthesis" in window)) return [];
    const synth = window.speechSynthesis;
    if (!synth) return [];

    const startedAt = Date.now();
    const timeoutMs = isAndroidLikeEnvironment() ? ANDROID_VOICE_TIMEOUT_MS : BASE_VOICE_TIMEOUT_MS;

    return new Promise<TtsVoice[]>((resolve) => {
      let settled = false;
      let intervalId: number | undefined;
      let timeoutId: number | undefined;

      const finish = (voices: Array<SpeechSynthesisVoice | TtsVoice>) => {
        if (settled) return;
        settled = true;
        if (intervalId !== undefined) window.clearInterval(intervalId);
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
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
        if (available.length > 0) finish(available);
      };

      const handleVoicesChanged = () => maybeFinish();
      synth.addEventListener("voiceschanged", handleVoicesChanged);
      maybeFinish();
      if (settled) return;

      intervalId = window.setInterval(() => {
        maybeFinish();
        if (!settled && Date.now() - startedAt >= timeoutMs) finish(readVoices());
      }, VOICE_POLL_INTERVAL_MS);

      timeoutId = window.setTimeout(() => finish(readVoices()), timeoutMs + 150);
    });
  })();

  const resolved = await voicesPromise;
  voicesPromise = null;
  return resolved;
}
