import Link from "next/link";

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

export function CollectionCard({ genre }: { genre: string }) {
  const emoji = EMOJIS[genre.toLowerCase().replace(" ", "")] ?? "📚";
  return (
    <Link
      href={`/?view=novels&q=${encodeURIComponent(genre)}`}
      className="flex items-center gap-4 rounded-lg border border-[var(--krvt-border)] bg-[var(--krvt-panel-strong)] p-4 transition-colors hover:bg-[var(--krvt-panel)]"
    >
      <span className="text-2xl">{emoji}</span>
      <span className="font-medium text-[var(--krvt-fg)]">{genre}</span>
    </Link>
  );
}
