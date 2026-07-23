export { useTTS } from "./hooks/useTTS";
export type { TtsState } from "./types/TtsState";
export type { TtsSettings } from "./types/TtsSettings";
export type { SpeechState } from "./types/SpeechState";
export type { TtsVoice } from "./types/TtsVoice";
export type { SpeakCallbacks } from "./types/SpeakCallbacks";

export { initializeTts } from "./services/queries/initializeTts";
export { filterVoices, loadVoices } from "./services/queries/loadVoices";
export {
  speak,
  pause,
  resume,
  stop,
  isSpeaking,
  isPaused,
} from "./services/runtime/TtsPlayer";

export {
  clearTtsResumeState,
  getTtsResumeState,
  saveTtsResumeState,
  type TtsResumeState,
} from "@/features/tts/repositories/ttsResumeRepository";

export { createTtsSessionManager, type TtsSessionSnapshot } from "@/core/tts/session";
