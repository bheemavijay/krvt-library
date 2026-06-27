function sanitizeFileName(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, "") // Remove illegal filesystem characters
    .replace(/[. ]+$/g, ""); // Remove trailing dots and spaces for Windows compatibility
}

function normalizeNovelSlug(novel) {
  const fallback = novel.slug ?? novel.title ?? novel.id ?? "unknown-novel";

  const slug = String(fallback)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove non-alphanumeric characters except spaces and hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-"); // Collapse multiple hyphens

  return sanitizeFileName(slug).replace(/^-+|-+$/g, ""); // Trim leading/trailing hyphens
}

module.exports = {
  normalizeNovelSlug,
  sanitizeFileName,
};