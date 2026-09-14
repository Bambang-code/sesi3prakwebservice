const { Pool } = require("pg");
const { attachDatabasePool } = require("@vercel/functions");

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL belum diatur; koneksi database akan gagal sampai variabel tersebut diisi.");
}

const isLocalDatabase = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || "");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocalDatabase ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
});

// Membantu Vercel menutup koneksi idle sebelum instance function dihentikan.
if (process.env.VERCEL) {
  attachDatabasePool(pool);
}

module.exports = pool;
