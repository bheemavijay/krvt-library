const { importNovel } = require("../services/importService");
const { buildStructuredLog, validateImportPayload } = require("../utils/normalize");

async function importController(req, res) {
  const validation = validateImportPayload(req.body);

  if (!validation.ok) {
    return res.status(400).json({ error: validation.message });
  }

  try {
    const safeOffset = Number(req.body?.offset ?? 0);

    console.info(
      JSON.stringify(
        buildStructuredLog("import.request.received", {
          url: validation.normalizedUrl,
          offset: Number.isFinite(safeOffset) ? safeOffset : 0,
        }),
      ),
    );

    const result = await importNovel({
      ...req.body,
      url: validation.normalizedUrl,
    });

    return res.status(200).json(result);
  } catch (error) {
    const statusCode = Number(error?.statusCode) || 500;
    const message =
      statusCode === 409
        ? "No new chapters available"
        : error?.message || "Import failed";

    console.error(
      JSON.stringify(
        buildStructuredLog("import.request.failed", {
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
