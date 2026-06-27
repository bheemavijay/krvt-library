const fs = require("fs/promises");

async function ensureDirectory(directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true });
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

async function writeRawFile(filePath, data) {
  await fs.writeFile(filePath, data);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  ensureDirectory,
  writeJson,
  writeRawFile,
  fileExists,
};