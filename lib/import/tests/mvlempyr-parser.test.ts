import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  parseChapter,
  parseChapterList,
  parseNovelDetails,
} from "../parsers/mvlempyr-parser";

const fixturesDir = path.join(process.cwd(), "lib", "import", "fixtures");
const chapterHtml = readFileSync(path.join(fixturesDir, "chapter.html"), "utf8");
const novelHtml = readFileSync(path.join(fixturesDir, "novel.html"), "utf8");

function runTests() {
  const chapter = parseChapter(chapterHtml);

  assert.ok(chapter.title.length > 0);
  assert.ok(chapter.content.length > 5);
  assert.equal(chapter.content.some((paragraph) => paragraph.length === 0), false);

  console.log("\u2714 Chapter parsed");

  const details = parseNovelDetails(novelHtml);

  assert.ok(details.title.length > 0);
  assert.ok(Array.isArray(details.tags));
  assert.ok(details.tags.length > 0);
  assert.ok(details.coverImage.length > 0);

  console.log("\u2714 Metadata parsed");

  const chapters = parseChapterList(novelHtml);

  assert.ok(chapters.length >= 10);
  assert.equal(chapters.every((chapter) => chapter.startsWith("https://")), true);

  console.log("\u2714 Chapter list parsed");
}
runTests();
