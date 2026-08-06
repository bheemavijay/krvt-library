import { NovelCard } from "@/components/novel-card";
import type { NovelSummary } from "@/shared/types";

type HorizontalNovelListProps = {
  novels: NovelSummary[];
};

export function HorizontalNovelList({ novels }: HorizontalNovelListProps) {
  if (!novels.length) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--krvt-border)] p-8 text-center">
        <p className="text-[var(--krvt-fg)]/60">No novels to display.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mb-4">
      {novels.map((novel) => (
        <div key={novel.id} className="w-[150px] sm:w-[180px] shrink-0">
          <NovelCard novel={novel} viewMode="grid" />
        </div>
      ))}
    </div>
  );
}
