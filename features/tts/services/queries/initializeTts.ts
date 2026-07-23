// This service is responsible for initializing the browser's speech synthesis engine.

import { Capacitor } from "@capacitor/core";

let bootPromise: Promise<boolean> | null = null;
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

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
export async function initializeTts(): Promise<boolean> {
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
