const path = require("path");
const { getNovelDirectory } = require("./paths");
const { writeJson } = require("./filesystem");

async function writeMetadata(provider, novel) {
  const novelDir = getNovelDirectory(provider, novel);
  const metadataPath = path.join(novelDir, "metadata.json");

  // Use the totalChapters from the provider result, which reflects the true total.
  // Fallback to other counts for safety, but totalChapters is the source of truth.
  const chapterCount =
    novel.totalChapters ??
    (Array.isArray(novel.chapters) ? novel.chapters.length : novel.chapterCount ?? 0);

  const coverUrl = novel.image ?? novel.cover ?? null;

  const metadata = {
    id: novel.id,
    provider,
    title: novel.title,
    author: novel.author,
    alternative: novel.alternative,
    status: novel.status,
    genres: novel.genres,
    tags: novel.tags,
    description: novel.description,
    rating: novel.rating,
    chapterCount,
    sourceUrl: novel.sourceUrl,
    cover: coverUrl,
    createdAt: novel.createdAt ?? new Date().toISOString(),
    updatedAt: novel.updatedAt ?? new Date().toISOString(),
  };

  await writeJson(metadataPath, metadata);
}

module.exports = {
  writeMetadata,
};