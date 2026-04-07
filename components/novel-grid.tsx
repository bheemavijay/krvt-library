import type { NovelSummary } from "@/types";

import { NovelCard } from "@/components/novel-card";

type NovelGridProps = {
  novels: NovelSummary[];
};

export function NovelGrid({ novels }: NovelGridProps) {
  if (novels.length === 0) {
    return (
      <section className="rounded-[1.75rem] border border-dashed border-border bg-panel/60 px-5 py-10 text-center shadow-[var(--shadow)] sm:px-8">
        <p className="text-xs uppercase tracking-[0.32em] text-accent">Library Empty</p>
        <h2 className="mt-4 font-heading text-2xl text-foreground sm:text-3xl">
          Your shelves are waiting.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted sm:text-base">
          Add your first novel when you are ready, and KRVT Library will turn it
          into a focused reading experience.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3 2xl:grid-cols-4">
      {novels.map((novel) => (
        <NovelCard key={novel.id} novel={novel} />
      ))}
    </section>
  );
}
