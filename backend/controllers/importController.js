const { importNovelWithProvider } = require("../providers");
const { buildStructuredLog, validateImportPayload } = require("../utils/normalize");

async function importController(req, res) {
  console.info(
    JSON.stringify(
      buildStructuredLog("krvt.debug.api.request", {
        url: req.body?.url,
        existingNovel: req.body?.existingNovel
          ? {
              title: req.body.existingNovel.title,
              novelUrl: req.body.existingNovel.novelUrl,
              chapterCount: req.body.existingNovel.chapterCount,
              lastChapterIndex: req.body.existingNovel.lastChapterIndex,
            }
          : null,
      })
    )
  );

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
          provider: validation.provider,
          offset: Number.isFinite(safeOffset) ? safeOffset : 0,
        }),
      ),
    );

    const result = await importNovelWithProvider(validation.provider, {
      ...req.body,
      url: validation.normalizedUrl,
    });

    console.info(
      JSON.stringify(
        buildStructuredLog("krvt.debug.api.response", {
          statusCode: 200,
          title: result?.title,
          chapters: result?.chapters?.length,
        })
      )
    );

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

    console.error("krvt.debug.api.error", error);

    return res.status(statusCode).json({ error: message });
  }
}

module.exports = {
  importController,
};