"use client";

import { useEffect, useState } from "react";
import { getAllNovels  } from "@/lib/storage/indexeddb";
import { NovelGrid } from "@/components/novel-grid";

export function LibraryClient() {
  const [novels, setNovels] = useState<Novel[]>([]);

  useEffect(() => {
    getAllNovels().then(setNovels);
  }, []);

  if (!novels.length) {
    return <p className="text-center mt-10">No novels yet 📚</p>;
  }

  return <NovelGrid novels={novels} />;
}