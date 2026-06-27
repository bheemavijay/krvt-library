const { importNovelWithProvider } = require("../providers");
const { exportNovel } = require("../storage/exporter");
const { buildStructuredLog, validateImportPayload } = require("../utils/normalize");

async function importController(req, res) {
  const requestId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const validation = validateImportPayload(req.body);

  if (!validation.ok) {
    return res.status(400).json({ error: validation.message });
  }

  try {
    const result = await importNovelWithProvider(validation.provider, {
      ...req.body,
      url: validation.normalizedUrl,
      requestId,
    });

    // Always attempt to export, even if there are no new chapters,
    // to ensure metadata is kept up-to-date.
    try {
      await exportNovel(validation.provider, result);
    } catch (error) {
      console.error({
        message: "Filesystem export failed but import succeeded. Client state will be updated.",
        provider: validation.provider,
        novelId: result.id,
        title: result.title,
        error: error.message,
        stack: error.stack,
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    const statusCode = Number(error?.statusCode) || 500;
    const message =
      statusCode === 409 ? "No new chapters available" : error?.message || "Import failed";

    console.error(
      JSON.stringify(
        buildStructuredLog("import.request.failed", {
          requestId,
          url: req.body?.url ?? null,
          statusCode,
          message,
        }),
      ),
    );

    return res.status(statusCode).json({ error: message });
  }
}

module.exports = {
  importController,
};