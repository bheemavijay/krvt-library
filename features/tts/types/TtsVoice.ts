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
