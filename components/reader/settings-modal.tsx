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

// ─── Data ─────────────────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  { label: "Night",       text: "#E8E0D0", bg: "#16151D" },
  { label: "Warm Dark",   text: "#F5F0E8", bg: "#1a1814" },
  { label: "AMOLED",      text: "#F5F5F5", bg: "#000000" },
  { label: "Sepia",       text: "#3E2F1C", bg: "#F1E7D0" },
  { label: "Paper",       text: "#212121", bg: "#FAFAFA" },
  { label: "Ocean",       text: "#B3D9FF", bg: "#0a1628" },
  { label: "Forest",      text: "#C8E6C9", bg: "#0d1f0e" },
  { label: "Slate",       text: "#B0BEC5", bg: "#1C1C1C" },
  { label: "Amber",       text: "#F0E6D3", bg: "#2b1d0e" },
  { label: "Indigo",      text: "#1A237E", bg: "#E8EAF6" },
  { label: "Gold",        text: "#F9A825", bg: "#1A1200" },
  { label: "Mono",        text: "#FFFFFF", bg: "#121212" },
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

const LINE_HEIGHT_OPTIONS = [1.0, 1.2, 1.5, 1.8, 2.0, 2.2, 2.4] as const;

const MAX_WIDTH_OPTIONS = [
  { label: "Narrow  — 600px", value: 600 },
  { label: "Default — 720px", value: 720 },
  { label: "Wide    — 860px", value: 860 },
  { label: "Full    — 1000px", value: 1000 },
] as const;

const FONT_SIZES = [12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 40] as const;

const TTS_RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0] as const;
const TTS_PITCHES = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0] as const;

// ─── Primitives ───────────────────────────────────────────────────────────────

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40">
    {children}
  </h3>
);

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="text-sm text-white/70">{label}</span>
    <div className="shrink-0">{children}</div>
  </div>
);

const Select = ({
  value,
  onChange,
  children,
}: {
  value: string | number;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full rounded-lg border border-white/10 bg-[#111319] px-3 py-2.5 text-sm text-white/80 outline-none transition-colors focus:border-white/20"
  >
    {children}
  </select>
);

const Toggle = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={cn(
      "relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors duration-200",
      checked
        ? "border-white/20 bg-white/20"
        : "border-white/10 bg-white/6",
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

const AlignIcon = ({ align }: { align: "left" | "center" | "right" }) => {
  const rows: Record<typeof align, string[]> = {
    left:   ["w-full", "w-3/4", "w-full", "w-2/3"],
    center: ["w-full", "w-3/4 mx-auto", "w-full", "w-1/2 mx-auto"],
    right:  ["w-full", "w-3/4 ml-auto", "w-full", "w-2/3 ml-auto"],
  };
  return (
    <div className="flex h-6 w-7 flex-col justify-center gap-[3px]">
      {rows[align].map((cls, i) => (
        <div key={i} className={cn("h-px rounded-full bg-current", cls)} />
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function SettingsModal({ isOpen, settings, onClose, onChange }: SettingsModalProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!isOpen) { stop(); return; }
    let cancelled = false;
    loadVoices().then((v) => { if (!cancelled) setVoices(filterVoices(v)); });
    return () => { cancelled = true; stop(); };
  }, [isOpen]);

  const selectedVoice = useMemo(
    () => voices.find((v) => v.voiceURI === settings.tts.voiceURI) ?? voices[0] ?? null,
    [settings.tts.voiceURI, voices],
  );

  useEffect(() => {
    if (!isOpen || settings.tts.voiceURI || !selectedVoice) return;
    onChange({ ...settings, tts: { ...settings.tts, voiceURI: selectedVoice.voiceURI } });
  }, [isOpen, onChange, selectedVoice, settings]);

  if (!isOpen) return null;

  const update = (partial: Partial<ReaderSettings>) =>
    onChange({ ...settings, ...partial, tts: { ...settings.tts, ...partial.tts } });

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/50 backdrop-blur-sm">
      <button type="button" aria-label="Close settings" onClick={onClose} className="absolute inset-0" />

      <aside className="relative z-10 flex h-full w-full max-w-[420px] flex-col border-l border-white/8 bg-[#0d0f13] shadow-[-32px_0_80px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-5 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-[#d4b16a]">Reader</p>
            <h2 className="mt-0.5 text-lg font-semibold text-white">Display Settings</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/50 transition hover:border-white/20 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-8">

            {/* ── COLOR PRESETS ── */}
            <section>
              <SectionTitle>Theme</SectionTitle>
              <div className="grid grid-cols-6 gap-2">
                {COLOR_PRESETS.map((preset) => {
                  const active =
                    settings.textColor === preset.text &&
                    settings.backgroundColor === preset.bg;
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
                      style={{ backgroundColor: preset.bg, color: preset.text, border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      A
                    </button>
                  );
                })}
              </div>

              {/* Custom colors */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/8 bg-white/4 px-3 py-2.5 text-xs text-white/50 transition hover:border-white/14">
                  <input
                    type="color"
                    value={settings.textColor}
                    onChange={(e) => update({ textColor: e.target.value })}
                    className="h-5 w-5 shrink-0 cursor-pointer rounded border-0 bg-transparent"
                  />
                  Text color
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/8 bg-white/4 px-3 py-2.5 text-xs text-white/50 transition hover:border-white/14">
                  <input
                    type="color"
                    value={settings.backgroundColor}
                    onChange={(e) => update({ backgroundColor: e.target.value })}
                    className="h-5 w-5 shrink-0 cursor-pointer rounded border-0 bg-transparent"
                  />
                  Background
                </label>
              </div>
            </section>

            {/* ── TYPOGRAPHY ── */}
            <section>
              <SectionTitle>Typography</SectionTitle>
              <div className="space-y-3">
                {/* Text align */}
                <div className="flex gap-2">
                  {(["left", "center", "right"] as const).map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => update({ textAlign: align })}
                      className={cn(
                        "flex flex-1 items-center justify-center rounded-lg border py-2.5 transition-all",
                        (settings.textAlign ?? "left") === align
                          ? "border-white/30 bg-white/10 text-white"
                          : "border-white/8 bg-white/4 text-white/40 hover:border-white/15 hover:text-white/70",
                      )}
                      title={`Align ${align}`}
                    >
                      <AlignIcon align={align} />
                    </button>
                  ))}
                </div>

                {/* Font family */}
                <Select
                  value={settings.fontFamily}
                  onChange={(v) => update({ fontFamily: v })}
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f} value={f} className="bg-[#111319]">{f}</option>
                  ))}
                </Select>

                {/* Font size */}
                <div>
                  <p className="mb-2 text-xs text-white/40">Font size — {settings.fontSize}px</p>
                  <div className="flex flex-wrap gap-1.5">
                    {FONT_SIZES.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => update({ fontSize: size })}
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-sm transition-all",
                          settings.fontSize === size
                            ? "bg-white/15 text-white ring-1 ring-white/30"
                            : "bg-white/4 text-white/50 hover:bg-white/8 hover:text-white/80",
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Line height */}
                <div>
                  <p className="mb-2 text-xs text-white/40">Line height — {settings.lineHeight}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {LINE_HEIGHT_OPTIONS.map((lh) => (
                      <button
                        key={lh}
                        type="button"
                        onClick={() => update({ lineHeight: lh })}
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-sm transition-all",
                          settings.lineHeight === lh
                            ? "bg-white/15 text-white ring-1 ring-white/30"
                            : "bg-white/4 text-white/50 hover:bg-white/8 hover:text-white/80",
                        )}
                      >
                        {lh.toFixed(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Max width */}
                <div>
                  <p className="mb-2 text-xs text-white/40">Reading width</p>
                  <Select
                    value={settings.contentMaxWidth ?? 720}
                    onChange={(v) => update({ contentMaxWidth: Number(v) })}
                  >
                    {MAX_WIDTH_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[#111319]">{opt.label}</option>
                    ))}
                  </Select>
                </div>
              </div>
            </section>

            {/* ── IMMERSIVE ── */}
            <section>
              <SectionTitle>Immersive</SectionTitle>
              <div className="space-y-2">
                {([
                  ["showNovelName",   "Show novel name"],
                  ["showChapterName", "Show chapter name"],
                  ["showTopNav",      "Show top nav"],
                  ["showBottomNav",   "Show bottom nav"],
                  ["showFooter",      "Show footer"],
                ] as const).map(([key, label]) => (
                  <Row key={key} label={label}>
                    <Toggle
                      checked={(settings as Record<string, unknown>)[key] as boolean ?? true}
                      onChange={(v) => update({ [key]: v } as Partial<ReaderSettings>)}
                    />
                  </Row>
                ))}
              </div>
            </section>
            {/* ── AUTOMATION ── */}
            <section>
              <SectionTitle>Automation</SectionTitle>

              <div className="space-y-2">
                <Row label="Auto play TTS">
                  <Toggle
                    checked={(settings as any).autoPlayTts ?? false}
                    onChange={(v) => update({ autoPlayTts: v } as any)}
                  />
                </Row>

                <Row label="Auto next chapter">
                  <Toggle
                    checked={(settings as any).autoNext ?? false}
                    onChange={(v) => update({ autoNext: v } as any)}
                  />
                </Row>
              </div>
            </section>

            {/* ── TTS ── */}
            <section>
              <SectionTitle>Text to speech</SectionTitle>
              <div className="space-y-3">
                <Select
                  value={settings.tts.voiceURI}
                  onChange={(v) => update({ tts: { ...settings.tts, voiceURI: v } })}
                >
                  {voices.length === 0 ? (
                    <option value="" className="bg-[#111319]">No voices available</option>
                  ) : (
                    voices.map((voice) => (
                      <option key={voice.voiceURI} value={voice.voiceURI} className="bg-[#111319]">
                        {voice.name} ({voice.lang})
                      </option>
                    ))
                  )}
                </Select>

                <Select
                  value={settings.tts.rate}
                  onChange={(v) => update({ tts: { ...settings.tts, rate: Number(v) } })}
                >
                  {TTS_RATES.map((r) => (
                    <option key={r} value={r} className="bg-[#111319]">{r}× speed</option>
                  ))}
                </Select>

                <Select
                  value={settings.tts.pitch}
                  onChange={(v) => update({ tts: { ...settings.tts, pitch: Number(v) } })}
                >
                  {TTS_PITCHES.map((p) => (
                    <option key={p} value={p} className="bg-[#111319]">
                      {p === 1.0 ? `${p} pitch (normal)` : `${p} pitch`}
                    </option>
                  ))}
                </Select>

                <button
                  type="button"
                  onClick={() =>
                    speak("This is a preview of your reading voice.", settings, {
                      onError: (m) => window.alert(m),
                    })
                  }
                  className="w-full rounded-lg border border-white/10 bg-white/4 py-2.5 text-sm text-white/70 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
                >
                  Preview voice
                </button>
              </div>
            </section>

            {/* ── PREVIEW ── */}
            <section>
              <SectionTitle>Preview</SectionTitle>
              <div
                className="rounded-xl border border-white/8 p-4"
                style={{
                  backgroundColor: settings.backgroundColor,
                  color: settings.textColor,
                  fontFamily: settings.fontFamily,
                  fontSize: `${settings.fontSize}px`,
                  lineHeight: settings.lineHeight,
                  textAlign: settings.textAlign ?? "left",
                }}
              >
                <p className="mb-2 text-[10px] uppercase tracking-[0.28em] opacity-50">Sample text</p>
                <p>The candlelight flickered as she turned the final page, breath held, heart suspended between worlds.</p>
                <p className="mt-3">Voice: {selectedVoice ? `${selectedVoice.name}` : "—"}</p>
              </div>
            </section>

          </div>
        </div>
      </aside>
    </div>
  );
}