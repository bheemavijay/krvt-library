require("dotenv").config();

const cors = require("cors");
const express = require("express");

const importRoutes = require("./routes/import");
const { buildStructuredLog } = require("./utils/normalize");

const app = express();
const PORT = Number(process.env.PORT || 4000);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

app.use(
  cors({
    origin: ALLOWED_ORIGIN === "*" ? true : ALLOWED_ORIGIN,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/import", importRoutes);

app.use((err, _req, res, _next) => {
  console.error(
    JSON.stringify(
      buildStructuredLog("server.unhandled-error", {
        message: err?.message || "Unhandled server error",
      }),
    ),
  );

  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.info(
    JSON.stringify(
      buildStructuredLog("server.started", {
        port: PORT,
        allowedOrigin: ALLOWED_ORIGIN,
      }),
    ),
  );
});
