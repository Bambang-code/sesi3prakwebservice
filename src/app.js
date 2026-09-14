const fs = require("fs");
const path = require("path");
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yaml");

const pool = require("./db");
const penjualanRouter = require("./routes/penjualan");

const app = express();
const openApiPath = path.join(__dirname, "..", "openapi.yaml");
const openApiDocument = YAML.parse(fs.readFileSync(openApiPath, "utf8"));

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

app.get("/", (_req, res) => {
  res.json({
    message: "API Penjualan",
    documentation: "/docs",
    openapi: "/openapi.yaml"
  });
});

app.get("/health", async (_req, res, next) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    next(error);
  }
});

app.get("/openapi.yaml", (_req, res) => {
  res.type("application/yaml").sendFile(openApiPath);
});
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.use("/api/penjualan", penjualanRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint tidak ditemukan" });
});

app.use((error, _req, res, _next) => {
  console.error(error);

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ error: "Body JSON tidak valid" });
  }

  if (error.code === "23503") {
    return res.status(400).json({ error: "pelanggan_id atau produk_id tidak ditemukan" });
  }

  return res.status(500).json({ error: "Terjadi kesalahan pada server" });
});

module.exports = app;

