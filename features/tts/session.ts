export type TtsSessionSnapshot = {
  runId: number;
  isPlaying: boolean;
  isPaused: boolean;
  currentParagraphIndex: number | null;
};

export function createTtsSessionManager() {
  let snapshot: TtsSessionSnapshot = {
    runId: 0,
    isPlaying: false,
    isPaused: false,
    currentParagraphIndex: null,
  };
  let pauseRequested = false;

  return {
    start(startParagraphIndex: number) {
      snapshot = {
        runId: snapshot.runId + 1,
        isPlaying: true,
        isPaused: false,
        currentParagraphIndex: startParagraphIndex,
      };
      pauseRequested = false;
      return snapshot.runId;
    },
    cancel() {
      snapshot = {
        runId: snapshot.runId + 1,
        isPlaying: false,
        isPaused: false,
        currentParagraphIndex: null,
      };
      pauseRequested = false;
      return snapshot.runId;
    },
    markParagraph(paragraphIndex: number) {
      snapshot = {
        ...snapshot,
        isPlaying: true,
        isPaused: false,
        currentParagraphIndex: paragraphIndex,
      };
    },
    setPauseRequested(value: boolean) {
      pauseRequested = value;
      snapshot = {
        ...snapshot,
        isPlaying: !value,
        isPaused: value,
      };
    },
    isPauseRequested() {
      return pauseRequested;
    },
    isCurrent(runId: number) {
      return snapshot.runId === runId;
    },
    getSnapshot() {
      return snapshot;
    },
  };
}
