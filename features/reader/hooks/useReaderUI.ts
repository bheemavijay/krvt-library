import { useState } from "react";

export function useReaderUI() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChapterPanelOpen, setIsChapterPanelOpen] = useState(false);
  const [chapterSearch, setChapterSearch] = useState("");
  const [, setStatusMessage] = useState("");

  return {
    isSettingsOpen,
    setIsSettingsOpen,
    isChapterPanelOpen,
    setIsChapterPanelOpen,
    chapterSearch,
    setChapterSearch,
    setStatusMessage,
  };
}
