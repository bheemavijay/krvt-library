"use client";

import { useEffect, useMemo, useState } from "react";

import type { ReaderSettings } from "@/lib/settings";
import { filterVoices, loadVoices, speak, stop } from "@/lib/tts";
import { cn } from "@/lib/utils";

type SettingsModalProps = {
  isOpen: boolean;
  settings: ReaderSettings;
  onClose: () => void;
  onChange: (settings: ReaderSettings) => void;
};

const FONT_OPTIONS = [
  "Georgia",
  "Times New Roman",
  "Iowan Old Style",
  "Garamond",
  "Palatino Linotype",
  "Book Antiqua",
];

const LINE_HEIGHT_OPTIONS = [1.6, 1.8, 2.0] as const;

const THEME_PRESETS = {
  Dark: {
    textColor: "#FFFFFF",
    backgroundColor: "#16151D",
  },
  Sepia: {
    textColor: "#3E2F1C",
    backgroundColor: "#F1E7D0",
  },
  AMOLED: {
    textColor: "#F5F5F5",
    backgroundColor: "#000000",
  },
} as const;

const sectionTitleClassName = "text-xs font-semibold uppercase tracking-[0.25em] text-white/70";
const fieldLabelClassName = "text-sm font-medium text-white/80";
const inputClassName =
  "w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35";

export function SettingsModal({
  isOpen,
  settings,
  onClose,
  onChange,
}: SettingsModalProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!isOpen) {
      stop();
      return;
    }

    let cancelled = false;

    loadVoices().then((loadedVoices) => {
      if (!cancelled) {
        setVoices(filterVoices(loadedVoices));
      }
    });

    return () => {
      cancelled = true;
      stop();
    };
  }, [isOpen]);

  const selectedVoice = useMemo(
    () => voices.find((voice) => voice.voiceURI === settings.tts.voiceURI) ?? voices[0] ?? null,
    [settings.tts.voiceURI, voices],
  );

  useEffect(() => {
    if (!isOpen || settings.tts.voiceURI || !selectedVoice) {
      return;
    }

    onChange({
      ...settings,
      tts: {
        ...settings.tts,
        voiceURI: selectedVoice.voiceURI,
      },
    });
  }, [isOpen, onChange, selectedVoice, settings]);

  if (!isOpen) {
    return null;
  }

  const update = (partial: Partial<ReaderSettings>) => {
    onChange({
      ...settings,
      ...partial,
      tts: {
        ...settings.tts,
        ...partial.tts,
      },
    });
  };

  const testVoice = async () => {
    await speak("This is a sample of your reader voice settings.", settings, {
      onError: (message) => {
        window.alert(message);
      },
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close settings"
        onClick={onClose}
        className="absolute inset-0"
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#14131b] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.45)] sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className={sectionTitleClassName}>Reader Settings</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Customize your reading space</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <section className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <h3 className={sectionTitleClassName}>Reading</h3>
              <div className="mt-5 space-y-5">
                <div className="space-y-2">
                  <label className={fieldLabelClassName} htmlFor="font-family">
                    Font family
                  </label>
                  <select
                    id="font-family"
                    className={inputClassName}
                    value={settings.fontFamily}
                    onChange={(event) => update({ fontFamily: event.target.value })}
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font} value={font} className="text-black">
                        {font}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className={fieldLabelClassName} htmlFor="font-size">
                    Font size: {settings.fontSize}px
                  </label>
                  <input
                    id="font-size"
                    type="range"
                    min={10}
                    max={40}
                    value={settings.fontSize}
                    onChange={(event) => update({ fontSize: Number(event.target.value) })}
                    className="w-full accent-amber-300"
                  />
                </div>

                <div className="space-y-2">
                  <p className={fieldLabelClassName}>Line height</p>
                  <div className="flex flex-wrap gap-2">
                    {LINE_HEIGHT_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => update({ lineHeight: option })}
                        className={cn(
                          "rounded-full border px-4 py-2 text-sm",
                          settings.lineHeight === option
                            ? "border-amber-300/40 bg-amber-200/10 text-amber-100"
                            : "border-white/10 bg-white/6 text-white hover:bg-white/10",
                        )}
                      >
                        {option.toFixed(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className={fieldLabelClassName}>Theme presets</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(THEME_PRESETS).map(([label, preset]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => update(preset)}
                        className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white hover:bg-white/10"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className={fieldLabelClassName} htmlFor="text-color">
                      Text color
                    </label>
                    <input
                      id="text-color"
                      type="color"
                      value={settings.textColor}
                      onChange={(event) => update({ textColor: event.target.value })}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-transparent p-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={fieldLabelClassName} htmlFor="background-color">
                      Background color
                    </label>
                    <input
                      id="background-color"
                      type="color"
                      value={settings.backgroundColor}
                      onChange={(event) => update({ backgroundColor: event.target.value })}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-transparent p-2"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <h3 className={sectionTitleClassName}>TTS</h3>
              <div className="mt-5 space-y-5">
                <div className="space-y-2">
                  <label className={fieldLabelClassName} htmlFor="tts-voice">
                    Voice
                  </label>
                  <select
                    id="tts-voice"
                    className={inputClassName}
                    value={settings.tts.voiceURI}
                    onChange={(event) =>
                      update({
                        tts: {
                          ...settings.tts,
                          voiceURI: event.target.value,
                        },
                      })
                    }
                  >
                    {voices.length === 0 ? (
                      <option value="" className="text-black">
                        No voices available
                      </option>
                    ) : (
                      voices.map((voice) => (
                        <option key={voice.voiceURI} value={voice.voiceURI} className="text-black">
                          {voice.name} ({voice.lang})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className={fieldLabelClassName} htmlFor="tts-rate">
                    Speed: {settings.tts.rate.toFixed(1)}x
                  </label>
                  <input
                    id="tts-rate"
                    type="range"
                    min={0.5}
                    max={3}
                    step={0.1}
                    value={settings.tts.rate}
                    onChange={(event) =>
                      update({
                        tts: {
                          ...settings.tts,
                          rate: Number(event.target.value),
                        },
                      })
                    }
                    className="w-full accent-amber-300"
                  />
                </div>

                <div className="space-y-2">
                  <label className={fieldLabelClassName} htmlFor="tts-pitch">
                    Pitch: {settings.tts.pitch.toFixed(1)}
                  </label>
                  <input
                    id="tts-pitch"
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={settings.tts.pitch}
                    onChange={(event) =>
                      update({
                        tts: {
                          ...settings.tts,
                          pitch: Number(event.target.value),
                        },
                      })
                    }
                    className="w-full accent-amber-300"
                  />
                </div>

                <button
                  type="button"
                  onClick={testVoice}
                  className="rounded-full border border-white/10 bg-white/6 px-4 py-3 text-sm font-medium text-white hover:bg-white/10"
                >
                  Test Voice
                </button>
              </div>
            </section>
          </div>

          <section className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
            <h3 className={sectionTitleClassName}>Preview</h3>
            <div
              className="mt-5 rounded-[1.5rem] border px-5 py-6 shadow-inner"
              style={{
                backgroundColor: settings.backgroundColor,
                color: settings.textColor,
                borderColor: "rgba(255,255,255,0.08)",
                fontFamily: settings.fontFamily,
              }}
            >
              <p className="mb-4 text-xs uppercase tracking-[0.3em] opacity-60">Live Preview</p>
              <h4 className="mb-4 text-2xl font-semibold">Chapter Preview</h4>
              <div
                className="space-y-4"
                style={{
                  fontSize: `${settings.fontSize}px`,
                  lineHeight: settings.lineHeight,
                }}
              >
                <p>
                  The corridor opened into silence, and the night air carried the feeling of an
                  unread page.
                </p>
                <p>
                  Every setting change here is applied instantly so the reader view feels exactly
                  like this preview.
                </p>
                <p className="text-sm opacity-70">
                  Voice: {selectedVoice ? `${selectedVoice.name} (${selectedVoice.lang})` : "Auto"}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
