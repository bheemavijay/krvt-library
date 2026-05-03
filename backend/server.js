require("dotenv").config();

const cors = require("cors");
const express = require("express");

const importRoutes = require("./routes/import");
const { buildStructuredLog } = require("./utils/normalize");

const app = express();

/**
 * IMPORTANT:
 * Railway provides PORT dynamically.
 * Always fallback to 8080.
 */
const PORT = process.env.PORT || 8080;

/**
 * Allow all origins for now (safe for your use case)
 * You can restrict later
 */
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

/**
 * Middleware
 */
app.use(
  cors({
    origin: ALLOWED_ORIGIN === "*" ? true : ALLOWED_ORIGIN,
  })
);

app.use(express.json({ limit: "1mb" }));

/**
 * Health Check (VERY IMPORTANT for Railway + debugging)
 */
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Routes
 */
app.use("/api/import", importRoutes);

/**
 * Global Error Handler
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
 * START SERVER (CRITICAL FIX)
 * Must bind to 0.0.0.0 for Railway / mobile access
 */
app.listen(PORT, "0.0.0.0", () => {
  console.info(
    JSON.stringify(
      buildStructuredLog("server.started", {
        port: PORT,
        allowedOrigin: ALLOWED_ORIGIN,
      })
    )
  );
});