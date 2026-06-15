const novelfull = require("../services/importService");
const mvlempyr = require("./mvlempyr");

const providers = {
  novelfull,
  mvlempyr,
};

async function importNovelWithProvider(providerName, payload) {
  const provider = providers[providerName];

  console.info("krvt.debug.provider.select", {
    url: payload.url,
    provider: providerName,
  });

  if (!provider) {
    const error = new Error(`Unsupported import provider: ${providerName}`);
    error.statusCode = 400;
    throw error;
  }

  return provider.importNovel(payload);
}

module.exports = {
  importNovelWithProvider,
  providers,
};