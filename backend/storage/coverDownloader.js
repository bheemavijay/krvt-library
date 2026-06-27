const path = require("path");
const axios = require("axios");
const { getNovelDirectory } = require("./paths");
const { fileExists, writeRawFile } = require("./filesystem");

async function downloadCover(provider, novel, imageUrl) {
  if (!imageUrl) {
    return false;
  }

  const novelDir = getNovelDirectory(provider, novel);
  const coverPath = path.join(novelDir, "cover.jpg");

  if (await fileExists(coverPath)) {
    return true;
  }

  try {
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    await writeRawFile(coverPath, response.data);
    return true;
  } catch (error) {
    // Silently fail, as this is a non-critical operation.
    // A more robust system might log this to a separate error log.
    return false;
  }
}

module.exports = {
  downloadCover,
};