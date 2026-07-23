import { Capacitor, registerPlugin } from "@capacitor/core";
import { addNovel, getNovel, getNovelSummaries } from "@/lib/storage/indexeddb";
import type { Novel } from "@/shared/types";

type FilesystemPlugin = {
  writeFile(options: {
    path: string;
    data: string;
    directory?: string;
    recursive?: boolean;
  }): Promise<{ uri: string }>;
};

const Filesystem = registerPlugin<FilesystemPlugin>("Filesystem");
const DIRECTORY_DOCUMENTS = "DOCUMENTS";

export function getBackupNovelSummaries() {
  return getNovelSummaries();
}

export function getBackupNovel(novelId: string) {
  return getNovel(novelId);
}

export function addBackupNovel(novel: Novel) {
  return addNovel(novel);
}

export async function writeBackupFile(blob: Blob, fileName: string) {
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    const data = await blobToBase64(blob);
    const result = await Filesystem.writeFile({
      path: fileName,
      data,
      directory: DIRECTORY_DOCUMENTS,
      recursive: true,
    });

    return {
      platform: "android" as const,
      uri: result.uri,
    };
  }

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 1000);

  return {
    platform: "web" as const,
  };
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
