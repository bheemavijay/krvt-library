const {
  getProviderDirectory,
  getNovelDirectory,
  getChapterDirectory,
} = require("./paths");
const { ensureDirectory } = require("./filesystem");
const { writeMetadata } = require("./metadataWriter");
const { writeChapters } = require("./chapterWriter");
const { downloadCover } = require("./coverDownloader");

async function exportNovel(provider, novel) {
  const providerDir = getProviderDirectory(provider);
  const novelDir = getNovelDirectory(provider, novel);
  const chapterDir = getChapterDirectory(provider, novel);

  await ensureDirectory(providerDir);
  await ensureDirectory(novelDir);
  await ensureDirectory(chapterDir);

  await writeMetadata(provider, novel);
  await writeChapters(provider, novel, novel.chapters);

  const coverUrl = novel.image ?? novel.cover ?? null;
  const coverDownloaded = await downloadCover(provider, novel, coverUrl);

  return {
    success: true,
    metadata: "metadata.json",
    chapters: Array.isArray(novel.chapters) ? novel.chapters.length : 0,
    cover: coverDownloaded ? "cover.jpg" : false,
    directory: novelDir,
  };
}

module.exports = {
  exportNovel,
};