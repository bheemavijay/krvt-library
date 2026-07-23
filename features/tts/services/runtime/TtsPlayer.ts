"use client";

import { Capacitor } from "@capacitor/core";
import { initializeTts } from "../queries/initializeTts";
import { loadVoices } from "../queries/loadVoices";
import { speakNative, stopNative } from "@/features/tts/repositories/nativeTextToSpeechRepository";
import type { TtsVoice } from "../../types/TtsVoice";
import type { SpeakCallbacks } from "../../types/SpeakCallbacks";

type TtsRuntimeSettings = {
  tts: {
    voiceURI: string;
    rate: number;
    pitch: number;
  };
};

let utterance: SpeechSynthesisUtterance | null = null;
let lastCallbacks: SpeakCallbacks = {};
let currentSpeechKey = "";
let nativeSpeaking = false;
let nativePaused = false;
let speakRunId = 0;

const DEFAULT_LANG = "en-US";
const MAX_NATIVE_CHUNK_LENGTH = 3000;

function isBrowserWithSpeechApis() {
  return (
    typeof window !== "undefined" &&
    typeof SpeechSynthesisUtterance !== "undefined" &&
    "speechSynthesis" in window
  );
}

function getSpeechSynthesisInstance() {
  if (!isBrowserWithSpeechApis()) return null;
  return window.speechSynthesis ?? null;
}

function isNativeTtsEnvironment() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

function normalizeLocale(value: string | undefined) {
  const locale = (value || DEFAULT_LANG).replace(/_/g, "-");
  try {
    return Intl.getCanonicalLocales(locale)[0] || DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

function findSpeakableWebVoice(voices: TtsVoice[], voiceURI: string) {
  const selectedVoice = voices.find((voice) => voice.voiceURI === voiceURI);
  if (isValidWebVoice(selectedVoice)) return selectedVoice;
  const defaultVoice = voices.find((voice) => voice.default && isValidWebVoice(voice));
  if (defaultVoice) return defaultVoice;
  return voices.find(isValidWebVoice) ?? null;
}

function isValidWebVoice(voice: TtsVoice | undefined): voice is TtsVoice & { nativeVoice: SpeechSynthesisVoice } {
  return Boolean(voice?.nativeVoice && typeof voice.nativeVoice.name === "string" && typeof voice.nativeVoice.lang === "string");
}

function clampSpeechNumber(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

function clearSpeechState() {
  utterance = null;
  currentSpeechKey = "";
  lastCallbacks = {};
  nativeSpeaking = false;
}

async function stopNativeSpeech(keepPaused = false) {
  try {
    await stopNative();
  } catch (error) {
    console.warn("TextToSpeech.stop failed", error);
  } finally {
    nativeSpeaking = false;
    nativePaused = keepPaused;
    clearSpeechState();
  }
}

function chunkText(text: string, maxLength: number) {
    const paragraphs = text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
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
        const splitAt = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("? "), slice.lastIndexOf("! "), slice.lastIndexOf(", "), slice.lastIndexOf(" "));
        const safeSplitAt = splitAt > maxLength * 0.5 ? splitAt + 1 : maxLength;
        chunks.push(remaining.slice(0, safeSplitAt).trim());
        remaining = remaining.slice(safeSplitAt).trim();
    }
    if (remaining) chunks.push(remaining);
    return chunks;
}

async function speakWithNativeTts(normalizedText: string, settings: TtsRuntimeSettings, callbacks: SpeakCallbacks) {
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
  currentSpeechKey = JSON.stringify({ text: normalizedText, voiceURI: settings.tts.voiceURI, rate: settings.tts.rate, pitch: settings.tts.pitch });
  lastCallbacks = callbacks;
  callbacks.onStart?.();
  try {
    const voices = await loadVoices();
    const selectedVoice = voices.find((voice) => voice.voiceURI === settings.tts.voiceURI) ?? null;
    const selectedVoiceIndex = typeof selectedVoice?.voiceIndex === "number" ? selectedVoice.voiceIndex : undefined;
    const selectedLang = normalizeLocale(selectedVoice?.lang);
    for (const [index, chunk] of chunks.entries()) {
      if (runId !== speakRunId) return false;
      await speakNative({
        text: chunk,
        lang: selectedLang,
        rate: clampSpeechNumber(settings.tts.rate, 0.1, 2, 1),
        pitch: clampSpeechNumber(settings.tts.pitch, 0.1, 2, 1),
        volume: 1,
        queueStrategy: 1,
        ...(selectedVoiceIndex !== undefined ? { voice: selectedVoiceIndex } : {}),
      });
      if (runId !== speakRunId) return false;
      if (index < chunks.length - 1) await new Promise(resolve => setTimeout(resolve, 80));
    }
    clearSpeechState();
    callbacks.onEnd?.();
    return true;
  } catch (error) {
    clearSpeechState();
    console.error("TextToSpeech.speak failed", { engine: "native", error });
    callbacks.onError?.("Text to speech could not start.");
    return false;
  }
}
export async function speak(text: string | string[], settings: TtsRuntimeSettings, callbacks: SpeakCallbacks = {}): Promise<boolean> {
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
    callbacks.onError?.("Speech synthesis is not supported in this browser.");
    return false;
  }
  const speechKey = JSON.stringify({ text: normalizedText, voiceURI: settings.tts.voiceURI, rate: settings.tts.rate, pitch: settings.tts.pitch });
  if (utterance && currentSpeechKey === speechKey) {
    lastCallbacks = callbacks;
    if (synth.paused) synth.resume();
    return true;
  }
  if (utterance) synth.cancel();
  const voices = await loadVoices(true);
  const nextUtterance = new SpeechSynthesisUtterance(normalizedText);
  const selectedVoice = findSpeakableWebVoice(voices, settings.tts.voiceURI);
  nextUtterance.lang = normalizeLocale(selectedVoice?.lang);
  if (selectedVoice?.nativeVoice) {
    nextUtterance.voice = selectedVoice.nativeVoice;
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
  if (synth.paused) synth.resume();
  synth.speak(nextUtterance);
  return true;
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
  if (!synth) return;
  if (synth.speaking) synth.pause();
  lastCallbacks.onPause?.();
}

export function resume() {
  if (isNativeTtsEnvironment()) {
    lastCallbacks.onResume?.();
    return;
  }
  const synth = getSpeechSynthesisInstance();
  if (!synth) return;
  if (synth.paused) synth.resume();
  lastCallbacks.onResume?.();
}

export function stop() {
  speakRunId += 1;
  if (isNativeTtsEnvironment()) {
    void stopNativeSpeech();
    return;
  }
  const synth = getSpeechSynthesisInstance();
  if (!synth) return;
  synth.cancel();
  utterance = null;
  currentSpeechKey = "";
  lastCallbacks = {};
}

export function isSpeaking() {
  if (isNativeTtsEnvironment()) return nativeSpeaking;
  const synth = getSpeechSynthesisInstance();
  return synth ? synth.speaking : false;
}

export function isPaused() {
  if (isNativeTtsEnvironment()) return nativePaused;
  const synth = getSpeechSynthesisInstance();
  return synth ? synth.paused : false;
}
