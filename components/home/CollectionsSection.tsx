"use client";

import { HomeSection } from "@/components/home/HomeSection";
import { CollectionCard } from "@/components/home/CollectionCard";
import { CANONICAL_GENRES } from "@/core/domain/genres";

export function CollectionsSection() {
  return (
    <HomeSection title="Browse Collections" viewAllHref="/?view=novels">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from(CANONICAL_GENRES).slice(0, 10).map((genre) => (
          <CollectionCard key={genre} genre={genre} />
        ))}
      </div>
    </HomeSection>
  );
}
