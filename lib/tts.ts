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

function isSpeechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function voicePriority(voice: SpeechSynthesisVoice) {
  const lang = voice.lang.toLowerCase();

  if (lang.startsWith("en-gb")) {
    return 0;
  }

  if (lang.startsWith("en-us")) {
    return 1;
  }

  if (lang.startsWith("en")) {
    return 2;
  }

  return 3;
}

export function filterVoices(voices: SpeechSynthesisVoice[]) {
  return [...voices]
    .filter((voice) => voice.lang.toLowerCase().startsWith("en"))
    .sort((left, right) => {
      const priorityDifference = voicePriority(left) - voicePriority(right);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return left.name.localeCompare(right.name);
    });
}

export function loadVoices(): Promise<TtsVoice[]> {
  if (!isSpeechSupported()) {
    return Promise.resolve([]);
  }

  const synth = window.speechSynthesis;

  return new Promise((resolve) => {
    const resolveVoices = () => {
      const available = filterVoices(synth.getVoices());

      if (available.length > 0) {
        resolve(available);
        return true;
      }

      return false;
    };

    if (resolveVoices()) {
      return;
    }

    const handleVoicesChanged = () => {
      if (resolveVoices()) {
        synth.removeEventListener("voiceschanged", handleVoicesChanged);
      }
    };

    synth.addEventListener("voiceschanged", handleVoicesChanged);

    window.setTimeout(() => {
      synth.removeEventListener("voiceschanged", handleVoicesChanged);
      resolve(filterVoices(synth.getVoices()));
    }, 1200);
  });
}

export async function speak(
  text: string | string[],
  settings: ReaderSettings,
  callbacks: SpeakCallbacks = {},
) {
  if (!isSpeechSupported()) {
    callbacks.onError?.("Speech synthesis is not supported in this browser.");
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
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    return true;
  }

  if (utterance) {
    window.speechSynthesis.cancel();
    utterance = null;
  }

  const voices = await loadVoices();
  const synth = window.speechSynthesis;
  const nextUtterance = new SpeechSynthesisUtterance(normalizedText);
  const selectedVoice =
    voices.find((voice) => voice.voiceURI === settings.tts.voiceURI) ?? voices[0] ?? null;

  if (selectedVoice) {
    nextUtterance.voice = selectedVoice;
    nextUtterance.lang = selectedVoice.lang;
  } else {
    nextUtterance.lang = "en-GB";
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
  synth.speak(nextUtterance);

  return true;
}

export function pause() {
  if (!isSpeechSupported()) {
    return;
  }

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
  }
  lastCallbacks.onPause?.();
}

export function resume() {
  if (!isSpeechSupported()) {
    return;
  }

  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }
  lastCallbacks.onResume?.();
}

export function stop() {
  if (!isSpeechSupported()) {
    return;
  }

  window.speechSynthesis.cancel();
  utterance = null;
  currentSpeechKey = "";
  lastCallbacks = {};
}

export function isSpeaking() {
  return isSpeechSupported() ? window.speechSynthesis.speaking : false;
}

export function isPaused() {
  return isSpeechSupported() ? window.speechSynthesis.paused : false;
}
