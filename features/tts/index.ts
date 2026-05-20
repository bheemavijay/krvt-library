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

export { createTtsSessionManager, type TtsSessionSnapshot } from "@/features/tts/session";
