const path = require("path");
const { normalizeNovelSlug } = require("./slug");

const STORAGE_ROOT = path.resolve(process.cwd(), "storage");

function getStorageRoot() {
  return STORAGE_ROOT;
}

function getProviderDirectory(provider) {
  return path.join(STORAGE_ROOT, provider);
}

function getNovelDirectory(provider, novel) {
  const novelSlug = normalizeNovelSlug(novel);
  return path.join(getProviderDirectory(provider), novelSlug);
}

function getChapterDirectory(provider, novel) {
  return path.join(getNovelDirectory(provider, novel), "chapters");
}

module.exports = {
  getStorageRoot,
  getProviderDirectory,
  getNovelDirectory,
  getChapterDirectory,
};