const path = require("path");
const axios = require("axios");
const { getNovelDirectory } = require("./paths");
const { fileExists, writeRawFile, ensureDirectoryExists, deleteFile } = require("./filesystem");
const mime = require("mime-types");

async function downloadCover(provider, novel, imageUrl) {
  if (!imageUrl) {
    return false;
  }

  const novelDir = getNovelDirectory(provider, novel);
  await ensureDirectoryExists(novelDir);

  try {
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 15000, // 15 second timeout
    });

    if (response.status !== 200) {
      console.error(`Failed to download cover for "${novel}". Status: ${response.status}`);
      return false;
    }

    const contentType = response.headers["content-type"];
    const extension = mime.extension(contentType) || "jpg";
    const coverFilename = `cover.${extension}`;
    const coverPath = path.join(novelDir, coverFilename);

    // Clean up old cover files if the extension changes
    const oldCoverJpg = path.join(novelDir, "cover.jpg");
    const oldCoverPng = path.join(novelDir, "cover.png");
    if (coverFilename !== "cover.jpg" && (await fileExists(oldCoverJpg))) {
      await deleteFile(oldCoverJpg);
    }
    if (coverFilename !== "cover.png" && (await fileExists(oldCoverPng))) {
      await deleteFile(oldCoverPng);
    }

    await writeRawFile(coverPath, response.data);
    return true;
  } catch (error) {
    console.error(`Failed to download cover for "${novel}" from ${imageUrl}.`, error);
    // A more robust system would use a dedicated logger and a retry mechanism for transient errors.
    return false;
  }
}

module.exports = {
  downloadCover,
};