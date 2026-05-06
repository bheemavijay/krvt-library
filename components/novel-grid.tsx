"use client";

import { useState } from "react";
import type { NovelSummary } from "@/types";
import { NovelCard } from "@/components/novel-card";
import { LayoutGrid, List } from "lucide-react";

type NovelGridProps = {
  novels: NovelSummary[];
};

export function NovelGrid({ novels }: NovelGridProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    return (window.localStorage.getItem("krvt-library-view-mode") as "grid" | "list") || "grid";
  });

  const toggleViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("krvt-library-view-mode", mode);
    }
  };

  if (novels.length === 0) {
    return (
      <section className="rounded-[1.75rem] border border-dashed border-white/15 bg-white/[0.02] px-5 py-10 text-center sm:px-8">
        <p className="text-xs uppercase tracking-[0.32em] text-accent">Library Empty</p>
        <h2 className="mt-4 font-heading text-2xl text-white sm:text-3xl">
          Your shelves are waiting.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/60 sm:text-base">
          Add your first novel when you are ready, and KRVT Library will turn it
          into a focused reading experience.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button
          onClick={() => toggleViewMode("grid")}
          className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg border transition ${
            viewMode === "grid"
              ? "border-accent/40 bg-accent-soft text-accent"
              : "border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.08]"
          }`}
          title="Grid View"
        >
          <LayoutGrid size={18} />
        </button>
        <button
          onClick={() => toggleViewMode("list")}
          className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg border transition ${
            viewMode === "list"
              ? "border-accent/40 bg-accent-soft text-accent"
              : "border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.08]"
          }`}
          title="List View"
        >
          <List size={18} />
        </button>
      </div>

      <section
        className={
          viewMode === "grid"
            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4"
            : "flex flex-col gap-3 sm:gap-4 md:grid md:grid-cols-2 lg:grid-cols-3"
        }
      >
        {novels.map((novel) => (
          <NovelCard key={novel.id} novel={novel} viewMode={viewMode} />
        ))}
      </section>
    </div>
  );
}
