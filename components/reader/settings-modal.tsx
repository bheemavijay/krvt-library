"use client";

import { useEffect, useMemo, useState } from "react";

import type { ReaderSettings, ReplacementRule } from "@/lib/settings";
import { filterVoices, loadVoices, speak } from "@/lib/tts";
import { cn } from "@/lib/utils";

type SettingsModalProps = {
  isOpen: boolean;
  settings: ReaderSettings;
  onClose: () => void;
  onChange: (settings: ReaderSettings) => void;
};

const COLOR_PRESETS = [
  { label: "Night", text: "#E8E0D0", bg: "#16151D" },
  { label: "AMOLED", text: "#F5F5F5", bg: "#000000" },
  { label: "Sepia", text: "#3E2F1C", bg: "#F1E7D0" },
  { label: "Paper", text: "#212121", bg: "#FAFAFA" },
  { label: "Ocean", text: "#B3D9FF", bg: "#0a1628" },
  { label: "Forest", text: "#C8E6C9", bg: "#0d1f0e" },
  { label: "Royal", text: "#F6E7C8", bg: "#221616" },
  { label: "Slate", text: "#E6EDF7", bg: "#121A26" },
] as const;

const FONT_OPTIONS = [
  "Georgia",
  "Times New Roman",
  "Garamond",
  "Palatino Linotype",
  "Book Antiqua",
  "Merriweather",
  "Lora",
];

const LINE_HEIGHT_OPTIONS = [1.2, 1.5, 1.8, 2.0, 2.2] as const;
const FONT_SIZES = [14, 16, 18, 20, 22, 24, 28, 32] as const;
const TTS_RATES = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0] as const;
const TTS_PITCHES = [0.75, 1.0, 1.25, 1.5] as const;

export function SettingsModal({ isOpen, settings, onClose, onChange }: SettingsModalProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    loadVoices().then((nextVoices) => {
      if (!cancelled) {
        setVoices(filterVoices(nextVoices));
      }
    });

    return () => {
      cancelled = true;
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
        ...(partial.tts ?? {}),
      },
    });
  };

  const updateReplacement = (index: number, partial: Partial<ReplacementRule>) => {
    const nextReplacements = settings.replacements.map((rule, currentIndex) =>
      currentIndex === index ? { ...rule, ...partial } : rule,
    );
    update({ replacements: nextReplacements });
  };

  const addReplacement = () => {
    update({
      replacements: [
        ...settings.replacements,
        { find: "", replace: "", caseSensitive: false, isRegex: false },
      ],
    });
  };

  const removeReplacement = (index: number) => {
    update({
      replacements: settings.replacements.filter((_, currentIndex) => currentIndex !== index),
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/55 backdrop-blur-sm">
      <button type="button" aria-label="Close settings" onClick={onClose} className="absolute inset-0" />

      <aside className="relative z-10 h-full w-full overflow-y-auto border-l border-white/10 bg-[#121318] px-4 py-4 shadow-lg sm:max-w-[480px] sm:px-6 sm:py-6 sm:shadow-[-24px_0_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between border-b border-white/8 pb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-[#d4b16a]">Reader Settings</p>
            <h2 className="mt-1 text-lg font-semibold text-white">Reading Controls</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/50 transition hover:border-white/20 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 py-5">
          <section className="space-y-4">
            <SectionTitle>Appearance</SectionTitle>

            <div className="grid grid-cols-6 gap-2">
              {COLOR_PRESETS.map((preset) => {
                const active =
                  settings.textColor === preset.text && settings.backgroundColor === preset.bg;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    title={preset.label}
                    onClick={() => update({ textColor: preset.text, backgroundColor: preset.bg })}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold transition-all",
                      active && "ring-2 ring-white/60 ring-offset-2 ring-offset-[#0d0f13]",
                    )}
                    style={{
                      backgroundColor: preset.bg,
                      color: preset.text,
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    A
                  </button>
                );
              })}
            </div>

            <Select
              value={settings.fontFamily}
              onChange={(value) => update({ fontFamily: value })}
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font} className="bg-[#111319]">
                  {font}
                </option>
              ))}
            </Select>

            <ChoiceGroup
              label={`Font size - ${settings.fontSize}px`}
              options={FONT_SIZES.map((size) => ({
                key: String(size),
                label: String(size),
                active: settings.fontSize === size,
                onClick: () => update({ fontSize: size }),
              }))}
            />

            <div className="grid grid-cols-2 gap-3">
              <ColorInput
                label="Text color"
                value={settings.textColor}
                onChange={(value) => update({ textColor: value })}
              />
              <ColorInput
                label="Background"
                value={settings.backgroundColor}
                onChange={(value) => update({ backgroundColor: value })}
              />
            </div>

            <ChoiceGroup
              label={`Line height - ${settings.lineHeight}`}
              options={LINE_HEIGHT_OPTIONS.map((lineHeight) => ({
                key: String(lineHeight),
                label: lineHeight.toFixed(1),
                active: settings.lineHeight === lineHeight,
                onClick: () => update({ lineHeight }),
              }))}
            />
          </section>

          <section className="space-y-4 border-t border-white/8 pt-6">
            <SectionTitle>Layout</SectionTitle>

            <div className="flex gap-2">
              {(["left", "center", "right"] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => update({ textAlign: align })}
                  className={cn(
                    "flex flex-1 items-center justify-center rounded-lg border py-2.5 transition-all",
                    settings.textAlign === align
                      ? "border-white/30 bg-white/10 text-white"
                      : "border-white/8 bg-white/4 text-white/40 hover:border-white/15 hover:text-white/70",
                  )}
                >
                  <AlignIcon align={align} />
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <ToggleRow
                label="Show chapter progress"
                checked={settings.showTopNav}
                onChange={(value) => update({ showTopNav: value })}
              />
              <ToggleRow
                label="Show bottom spacing"
                checked={settings.showBottomNav}
                onChange={(value) => update({ showBottomNav: value })}
              />
            </div>
          </section>

          <section className="space-y-4 border-t border-white/8 pt-6">
            <SectionTitle>Controls</SectionTitle>

            <div className="space-y-2">
              <ToggleRow
                label="Auto next chapter"
                checked={settings.autoNext}
                onChange={(value) => update({ autoNext: value })}
              />
              <ToggleRow
                label="Auto play next TTS"
                checked={settings.autoPlayTts}
                onChange={(value) => update({ autoPlayTts: value })}
              />
            </div>

            {voices.length > 0 ? (
              <Select
                value={settings.tts.voiceURI}
                onChange={(value) => update({ tts: { ...settings.tts, voiceURI: value } })}
              >
                {voices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI} className="bg-[#111319]">
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </Select>
            ) : null}

            <Select
              value={settings.tts.rate}
              onChange={(value) => update({ tts: { ...settings.tts, rate: Number(value) } })}
            >
              {TTS_RATES.map((rate) => (
                <option key={rate} value={rate} className="bg-[#111319]">
                  {rate}x speed
                </option>
              ))}
            </Select>

            <Select
              value={settings.tts.pitch}
              onChange={(value) => update({ tts: { ...settings.tts, pitch: Number(value) } })}
            >
              {TTS_PITCHES.map((pitch) => (
                <option key={pitch} value={pitch} className="bg-[#111319]">
                  {pitch === 1 ? `${pitch} pitch (normal)` : `${pitch} pitch`}
                </option>
              ))}
            </Select>

            <button
              type="button"
              onClick={() =>
                speak("This is a preview of your reading voice.", settings, {
                  onError: (message) => window.alert(message),
                })
              }
              className="w-full rounded-lg border border-white/10 bg-white/4 py-2.5 text-sm text-white/70 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
            >
              Preview voice
            </button>
          </section>

          <section className="space-y-4 border-t border-white/8 pt-6">
            <SectionTitle>Replace Rules</SectionTitle>

            <div className="space-y-3">
              {settings.replacements.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-white/45">
                  No replacement rules yet. Add rules here to clean scraped text only inside the reader.
                </p>
              ) : null}

              {settings.replacements.map((rule, index) => (
                <div key={`${rule.find}-${index}`} className="space-y-3 rounded-xl border border-white/10 bg-white/4 p-4">
                  <input
                    type="text"
                    placeholder="Find text or regex"
                    value={rule.find}
                    onChange={(event) => updateReplacement(index, { find: event.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#111319] px-3 py-2.5 text-sm text-white outline-none focus:border-white/20"
                  />
                  <input
                    type="text"
                    placeholder="Replace with"
                    value={rule.replace}
                    onChange={(event) => updateReplacement(index, { replace: event.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#111319] px-3 py-2.5 text-sm text-white outline-none focus:border-white/20"
                  />
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-white/65">
                        <input
                          type="checkbox"
                          checked={rule.caseSensitive}
                          onChange={(event) =>
                            updateReplacement(index, { caseSensitive: event.target.checked })
                          }
                          className="h-4 w-4 accent-[#d4b16a]"
                        />
                        Case sensitive
                      </label>
                      <label className="flex items-center gap-2 text-sm text-white/65">
                        <input
                          type="checkbox"
                          checked={rule.isRegex}
                          onChange={(event) =>
                            updateReplacement(index, { isRegex: event.target.checked })
                          }
                          className="h-4 w-4 accent-[#d4b16a]"
                        />
                        Regex
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeReplacement(index)}
                      className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-200 transition hover:bg-red-400/20"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addReplacement}
                className="w-full rounded-xl border border-dashed border-white/20 px-4 py-3 text-sm text-white/70 transition hover:border-white/30 hover:bg-white/5 hover:text-white"
              >
                Add replacement rule
              </button>
            </div>
          </section>

        </div>
      </aside>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40">{children}</h3>;
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string | number;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-white/10 bg-[#111319] px-3 py-2.5 text-sm text-white/80 outline-none transition-colors focus:border-white/20"
    >
      {children}
    </select>
  );
}

function ChoiceGroup({
  label,
  options,
}: {
  label: string;
  options: Array<{ key: string; label: string; active: boolean; onClick: () => void }>;
}) {
  return (
    <div>
      <p className="mb-2 text-xs text-white/40">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={option.onClick}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm transition-all",
              option.active
                ? "bg-white/15 text-white ring-1 ring-white/30"
                : "bg-white/4 text-white/50 hover:bg-white/8 hover:text-white/80",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-xs text-white/40">{label}</span>
      <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#111319] px-3 py-2.5">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-8 rounded border border-white/10 bg-transparent"
        />
        <span className="text-sm text-white/80">{value}</span>
      </div>
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-white/70">{label}</span>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors duration-200",
        checked ? "border-white/20 bg-white/20" : "border-white/10 bg-white/6",
      )}
    >
      <span
        className={cn(
          "absolute top-[1px] h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-[21px]" : "translate-x-[1px]",
        )}
        style={{ opacity: checked ? 1 : 0.5 }}
      />
    </button>
  );
}

function AlignIcon({ align }: { align: "left" | "center" | "right" }) {
  const rows: Record<typeof align, string[]> = {
    left: ["w-full", "w-3/4", "w-full", "w-2/3"],
    center: ["w-full", "w-3/4 mx-auto", "w-full", "w-1/2 mx-auto"],
    right: ["w-full", "w-3/4 ml-auto", "w-full", "w-2/3 ml-auto"],
  };

  return (
    <div className="flex h-6 w-7 flex-col justify-center gap-[3px]">
      {rows[align].map((row, index) => (
        <div key={index} className={cn("h-px rounded-full bg-current", row)} />
      ))}
    </div>
  );
}
