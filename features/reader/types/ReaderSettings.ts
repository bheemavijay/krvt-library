// This type defines the settings for the Reader feature.

export type ReplacementRule = {
  find: string;
  replace: string;
  caseSensitive: boolean;
  isRegex: boolean;
};

export type ReaderSettings = {
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  textColor: string;
  backgroundColor: string;
  textAlign: "left" | "center" | "right";
  contentMaxWidth: number;
  showNovelName: boolean;
  showChapterName: boolean;
  showTopNav: boolean;
  showBottomNav: boolean;
  showFooter: boolean;
  autoScroll: boolean;
  paragraphHighlight: boolean;
  autoNext: boolean;
  autoPlayTts: boolean;
  replacements: ReplacementRule[];
  tts: {
    voiceURI: string;
    rate: number;
    pitch: number;
  };
};
