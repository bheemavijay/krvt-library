"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";
import { addNovel, getNovel, getNovelSummaries } from "@/lib/storage/indexeddb";
import type { Novel } from "@/shared/types";

type LibraryBackupPayload = {
  version: 1;
  exportedAt: string;
  novels: Novel[];
};

type ImportLibraryOptions = {
  onProgress?: (progress: {
    processedNovels: number;
    processedBytes: number;
    totalBytes: number;
    failedNovels: string[];
  }) => void;
};

type ImportLibraryResult = {
  importedCount: number;
  failedNovels: string[];
};

type ExportLibraryOptions = {
  onProgress?: (progress: {
    processedNovels: number;
    totalNovels: number;
    writtenBytes: number;
  }) => void;
};

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

export async function exportLibrary(options: ExportLibraryOptions = {}) {
  const summaries = await getNovelSummaries();
  const parts: BlobPart[] = [
    `{\n  "version": 1,\n  "exportedAt": ${JSON.stringify(new Date().toISOString())},\n  "novels": [\n`,
  ];
  let writtenNovels = 0;
  let writtenBytes = String(parts[0]).length;

  for (let index = 0; index < summaries.length; index += 1) {
    const novel = await getNovel(summaries[index].id);
    if (!novel) {
      continue;
    }

    const serializedNovel = `${writtenNovels > 0 ? ",\n" : ""}${JSON.stringify(novel)}`;
    parts.push(serializedNovel);
    writtenNovels += 1;
    writtenBytes += serializedNovel.length;
    options.onProgress?.({
      processedNovels: writtenNovels,
      totalNovels: summaries.length,
      writtenBytes,
    });
    await yieldToUi();
  }

  parts.push("\n  ]\n}");
  writtenBytes += 6;

  const blob = new Blob(parts, { type: "application/json" });
  const fileName = `krvt-library-backup-${new Date().toISOString().slice(0, 10)}.json`;

  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    const data = await blobToBase64(blob);
    const result = await Filesystem.writeFile({
      path: fileName,
      data,
      directory: DIRECTORY_DOCUMENTS,
      recursive: true,
    });

    return {
      fileName,
      platform: "android" as const,
      uri: result.uri,
      novelCount: writtenNovels,
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
    fileName,
    platform: "web" as const,
    novelCount: writtenNovels,
  };
}

export async function importLibrary(
  file: File,
  options: ImportLibraryOptions = {},
): Promise<ImportLibraryResult> {
  if (typeof file.stream !== "function") {
    return importLibraryFromText(file, options);
  }

  let processedNovels = 0;
  let processedBytes = 0;
  const failedNovels: string[] = [];

  for await (const novel of streamBackupNovels(file, (bytes) => {
    processedBytes = bytes;
    options.onProgress?.({
      processedNovels,
      processedBytes,
      totalBytes: file.size,
      failedNovels: [...failedNovels],
    });
  })) {
    const imported = await importNovelWithRetry(novel);
    if (imported) {
      processedNovels += 1;
    } else {
      failedNovels.push(getNovelLabel(novel, failedNovels.length + processedNovels + 1));
    }
    options.onProgress?.({
      processedNovels,
      processedBytes,
      totalBytes: file.size,
      failedNovels: [...failedNovels],
    });
    await yieldToUi();
  }

  if (processedNovels === 0) {
    if (failedNovels.length > 0) {
      throw new Error("Backup import failed for every novel.");
    }
    throw new Error("Backup file does not contain any novels.");
  }

  return {
    importedCount: processedNovels,
    failedNovels,
  };
}

async function importLibraryFromText(
  file: File,
  options: ImportLibraryOptions,
): Promise<ImportLibraryResult> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Partial<LibraryBackupPayload> | Novel[];
  const novels = Array.isArray(parsed) ? parsed : parsed.novels;

  if (!Array.isArray(novels) || novels.length === 0) {
    throw new Error("Backup file does not contain any novels.");
  }

  let processedNovels = 0;
  const failedNovels: string[] = [];

  for (let index = 0; index < novels.length; index += 1) {
    const imported = await importNovelWithRetry(novels[index]);
    if (imported) {
      processedNovels += 1;
    } else {
      failedNovels.push(getNovelLabel(novels[index], index + 1));
    }
    options.onProgress?.({
      processedNovels,
      processedBytes: text.length,
      totalBytes: file.size,
      failedNovels: [...failedNovels],
    });
    await yieldToUi();
  }

  if (processedNovels === 0) {
    if (failedNovels.length > 0) {
      throw new Error("Backup import failed for every novel.");
    }
    throw new Error("Backup file does not contain any novels.");
  }

  return {
    importedCount: processedNovels,
    failedNovels,
  };
}

async function* streamBackupNovels(
  file: File,
  onBytes: (processedBytes: number) => void,
): AsyncGenerator<Novel> {
  const reader = file.stream().getReader();
  const decoder = new TextDecoder();

  let phase: "seek-root" | "seek-novels" | "read-objects" | "done" = "seek-root";
  let prefixBuffer = "";
  let objectBuffer = "";
  let processedBytes = 0;
  let braceDepth = 0;
  let inString = false;
  let escapeNext = false;

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    processedBytes += value.byteLength;
    onBytes(processedBytes);

    const chunk = decoder.decode(value, { stream: true });
    for (const character of chunk) {
      if (phase === "seek-root") {
        if (/\s/.test(character)) {
          continue;
        }

        if (character === "[") {
          phase = "read-objects";
        } else {
          prefixBuffer += character;
          phase = "seek-novels";
        }
        continue;
      }

      if (phase === "seek-novels") {
        prefixBuffer = `${prefixBuffer}${character}`.slice(-64);
        if (prefixBuffer.includes('"novels"') && character === "[") {
          phase = "read-objects";
        }
        continue;
      }

      if (phase === "done") {
        continue;
      }

      if (braceDepth === 0) {
        if (character === "{") {
          objectBuffer = "{";
          braceDepth = 1;
          inString = false;
          escapeNext = false;
          continue;
        }

        if (character === "]") {
          phase = "done";
        }

        continue;
      }

      objectBuffer += character;

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (character === "\\") {
        escapeNext = true;
        continue;
      }

      if (character === '"') {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (character === "{") {
        braceDepth += 1;
      } else if (character === "}") {
        braceDepth -= 1;
      }

      if (braceDepth === 0) {
        yield JSON.parse(objectBuffer) as Novel;
        objectBuffer = "";
      }
    }
  }

  const finalText = decoder.decode();
  if (finalText && objectBuffer) {
    objectBuffer += finalText;
  }
}

async function yieldToUi() {
  await new Promise((resolve) => window.setTimeout(resolve, 0));
}

async function importNovelWithRetry(novel: Novel, remainingAttempts = 2): Promise<boolean> {
  try {
    await addNovel(novel);
    return true;
  } catch (error) {
    if (remainingAttempts <= 0) {
      console.error("Backup novel import failed:", novel?.title, error);
      return false;
    }

    await wait(150);
    return importNovelWithRetry(novel, remainingAttempts - 1);
  }
}

function getNovelLabel(novel: Partial<Novel> | undefined, fallbackIndex: number) {
  const title = typeof novel?.title === "string" ? novel.title.trim() : "";
  return title || `Novel ${fallbackIndex}`;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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
