require("dotenv").config();

const cors = require("cors");
const express = require("express");

const importRoutes = require("./routes/import");
const { buildStructuredLog } = require("./utils/normalize");

const app = express();

/**
 * Railway assigns PORT dynamically.
 * Always fallback to 8080 locally.
 */
const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

/**
 * CORS
 */
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

app.use(
  cors({
    origin: ALLOWED_ORIGIN === "*" ? true : ALLOWED_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  })
);

/**
 * Body parser
 */
app.use(express.json({ limit: "1mb" }));

/**
 * ROOT ROUTE (IMPORTANT for Railway health check)
 */
app.get("/", (_req, res) => {
  res.status(200).send("KRVT Library Backend Running 🚀");
});

/**
 * HEALTH CHECK
 */
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

/**
 * ROUTES
 */
app.use("/api/import", importRoutes);

/**
 * GLOBAL ERROR HANDLER
 */
app.use((err, _req, res, _next) => {
  console.error(
    JSON.stringify(
      buildStructuredLog("server.unhandled-error", {
        message: err?.message || "Unhandled server error",
      })
    )
  );

  res.status(500).json({ error: "Internal server error" });
});

/**
 * HANDLE CRASHES (VERY IMPORTANT IN PROD)
 */
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT_EXCEPTION", err);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED_REJECTION", err);
});

/**
 * START SERVER
 */
app.listen(PORT, HOST, () => {
  console.info(
    JSON.stringify(
      buildStructuredLog("server.started", {
        port: PORT,
        host: HOST,
        allowedOrigin: ALLOWED_ORIGIN,
      })
    )
  );
});