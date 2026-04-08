import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

type LocalNovel = {
  title: string;
  cover: string;
  description: string;
  genres: string[];
};

type LocalChapter = {
  title: string;
  content: string[];
};

type LocalChapterStatus = "SUCCESS" | "FAILED";

export function createNovelStoragePaths(title: string) {
  const slug = slugify(title);
  const rootDir = path.join(process.cwd(), "data", "novels", slug);
  const chaptersDir = path.join(rootDir, "chapters");

  mkdirSync(chaptersDir, { recursive: true });

  return {
    slug,
    rootDir,
    chaptersDir,
    metaPath: path.join(rootDir, "meta.json"),
  };
}

export function saveNovelMetadata(metaPath: string, novel: LocalNovel) {
  writeJson(metaPath, {
    title: novel.title,
    cover: novel.cover,
    description: novel.description,
    genres: novel.genres,
  });
}

export function saveLocalChapter(
  chaptersDir: string,
  index: number,
  chapter: LocalChapter | null,
  status: LocalChapterStatus,
) {
  const chapterPath = path.join(chaptersDir, `${index + 1}.json`);

  writeJson(chapterPath, {
    title: chapter?.title || `Chapter ${index + 1}`,
    content: chapter?.content ?? [],
    status,
  });

  return chapterPath;
}

function writeJson(filePath: string, value: unknown) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "novel";
}
