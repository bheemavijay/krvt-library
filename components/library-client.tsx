"use client";

import { useEffect, useState } from "react";
import { getNovelSummaries } from "@/features/library";
import { NovelGrid } from "@/components/novel-grid";
import type { NovelSummary } from "@/shared/types";

export function LibraryClient() {
  const [novels, setNovels] = useState<NovelSummary[]>([]);

  useEffect(() => {
    getNovelSummaries().then(setNovels);
  }, []);

  if (!novels.length) {
    return <p className="text-center mt-10">No novels yet 📚</p>;
  }

 return <NovelGrid novels={novels} />;
}
