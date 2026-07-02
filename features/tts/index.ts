export {
  filterVoices,
  initializeTts,
  isPaused,
  isSpeaking,
  loadVoices,
  pause,
  resume,
  speak,
  stop,
  type TtsVoice,
} from "@/lib/tts";

export {
  clearTtsResumeState,
  getTtsResumeState,
  saveTtsResumeState,
  type TtsResumeState,
} from "@/lib/tts-storage";

export { createTtsSessionManager, type TtsSessionSnapshot } from "@/core/tts/session";
