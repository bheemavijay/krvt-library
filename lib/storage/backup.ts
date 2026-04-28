"use client";

import { addNovel, getAllNovels } from "@/lib/storage/indexeddb";
import type { Novel } from "@/types";

type LibraryBackupPayload = {
  version: 1;
  exportedAt: string;
  novels: Novel[];
};

export async function exportLibrary() {
  const novels = await getAllNovels();
  const payload: LibraryBackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    novels,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `krvt-library-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 1000);
}

export async function importLibrary(file: File) {
  const text = await file.text();
  const parsed = JSON.parse(text) as Partial<LibraryBackupPayload> | Novel[];
  const novels = Array.isArray(parsed) ? parsed : parsed.novels;

  if (!Array.isArray(novels) || novels.length === 0) {
    throw new Error("Backup file does not contain any novels.");
  }

  for (const novel of novels) {
    await addNovel(novel);
  }

  return novels.length;
}
