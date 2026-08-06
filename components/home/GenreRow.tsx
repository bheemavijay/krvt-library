"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CANONICAL_GENRES } from "@/core/domain/genres";

const EMOJIS: Record<string, string> = {
  action: "⚔️",
  adventure: "🗺️",
  fantasy: "🐉",
  "sci-fi": "🚀",
  romance: "❤️",
  supernatural: "👻",
  mystery: "🕵️",
  horror: "🎃",
  comedy: "😂",
  drama: "🎭",
  sliceoflife: "🍰",
  martialarts: "🥋",
  wuxia: "🗡️",
  xianxia: "☯️",
};

function GenreChip({ genre }: { genre: string }) {
  const emoji = EMOJIS[genre.toLowerCase().replace(/ /g, "")] ?? "📚";
  return (
    <Link
      href={`/?view=novels&q=${encodeURIComponent(genre)}`}
      className="flex items-center gap-4 rounded-xl border border-[var(--krvt-border)] bg-[var(--krvt-panel-strong)] p-4 transition-colors hover:bg-[var(--krvt-panel)]"
    >
      <span className="text-2xl">{emoji}</span>
      <span className="font-medium text-base text-[var(--krvt-fg)]">{genre}</span>
    </Link>
  );
}

export function GenreRow() {
  return (
    <section className="py-8 sm:py-12">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <h2 className="font-heading text-2xl font-medium text-[var(--krvt-fg)] sm:text-3xl">
            Collections
          </h2>
          <Link href="/?view=novels" className="flex items-center gap-2 text-sm text-[var(--krvt-accent)] transition-colors hover:text-[var(--krvt-fg)]">
            View All
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array.from(CANONICAL_GENRES).slice(0, 10).map((genre) => (
            <GenreChip key={genre} genre={genre} />
          ))}
        </div>
      </div>
    </section>
  );
}
