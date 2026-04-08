"use client";

import { createContext, useContext, useMemo, useState } from "react";

type SettingsModalContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const SettingsModalContext = createContext<SettingsModalContextValue | null>(null);

export function SettingsModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const value = useMemo(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [isOpen],
  );

  return (
    <SettingsModalContext.Provider value={value}>{children}</SettingsModalContext.Provider>
  );
}

export function useSettingsModal() {
  const context = useContext(SettingsModalContext);

  if (!context) {
    throw new Error("useSettingsModal must be used within SettingsModalProvider.");
  }

  return context;
}
