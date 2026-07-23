import { registerPlugin } from "@capacitor/core";

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

export function getSupportedNativeVoices() {
  return NativeTextToSpeech.getSupportedVoices?.();
}

export function speakNative(options: Parameters<NativeTextToSpeechPlugin["speak"]>[0]) {
  return NativeTextToSpeech.speak(options);
}

export function stopNative() {
  return NativeTextToSpeech.stop();
}
