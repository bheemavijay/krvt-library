"use client";

import { useEffect, useState } from "react";
import { getAllNovels  } from "@/lib/storage/indexeddb";
import { NovelGrid } from "@/components/novel-grid";
import type { Novel } from "@/types";

export function LibraryClient() {
  const [novels, setNovels] = useState<Novel[]>([]);

  useEffect(() => {
    getAllNovels().then(setNovels);
  }, []);

  if (!novels.length) {
    return <p className="text-center mt-10">No novels yet 📚</p>;
  }

 const summaries = novels.map((n) => ({
   ...n,
   chapterCount: n.chapters?.length ?? 0,
 }));

 return <NovelGrid novels={summaries} />;
}