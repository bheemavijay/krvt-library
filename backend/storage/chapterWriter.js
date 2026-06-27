const path = require("path");
const { getChapterDirectory } = require("./paths");
const { writeJson, fileExists } = require("./filesystem");

function formatChapterId(chapterNumber) {
  return String(chapterNumber).padStart(4, "0");
}

async function writeChapter(provider, novel, chapter) {
  const chapterDir = getChapterDirectory(provider, novel);
  const chapterNumber = chapter.order;
  const chapterFileName = `${formatChapterId(chapterNumber)}.json`;
  const chapterPath = path.join(chapterDir, chapterFileName);

  // Skip writing if the file already exists.
  if (await fileExists(chapterPath)) {
    return;
  }

  const chapterData = {
    id: chapter.id ?? String(chapter.order),
    title: chapter.title ?? "",
    content: Array.isArray(chapter.content) ? chapter.content : [],
  };

  await writeJson(chapterPath, chapterData);
}

async function writeChapters(provider, novel, chapters) {
  if (!Array.isArray(chapters)) {
    return;
  }

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const guaranteedOrderChapter = {
      ...chapter,
      order: chapter.order ?? i + 1,
    };
    await writeChapter(provider, novel, guaranteedOrderChapter);
  }
}

module.exports = {
  writeChapter,
  writeChapters,
};