const express = require("express");
const pool = require("../db");

const router = express.Router();
const STATUS = ["pending", "disetujui", "dikirim", "dibatalkan"];
const TRANSISI_STATUS = {
  pending: ["disetujui", "dibatalkan"],
  disetujui: ["dikirim", "dibatalkan"],
  dikirim: [],
  dibatalkan: []
};

const selectDetail = `
  SELECT
    pj.id,
    pj.pelanggan_id,
    pl.nama AS nama_pelanggan,
    pj.produk_id,
    pr.nama_produk,
    pj.jumlah,
    pj.tanggal::text AS tanggal,
    pj.total::float8 AS total,
    pj.status
  FROM penjualan pj
  LEFT JOIN pelanggan pl ON pl.id = pj.pelanggan_id
  LEFT JOIN produk pr ON pr.id = pj.produk_id
`;

function parseId(value) {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function parsePositiveInteger(value, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function isDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

router.get("/", async (req, res, next) => {
  try {
    const page = parsePositiveInteger(req.query.page, 1);
    const limit = parsePositiveInteger(req.query.limit, 10);
    const status = req.query.status;

    if (!page || !limit || limit > 100) {
      return res.status(400).json({ error: "page dan limit harus bilangan positif; limit maksimal 100" });
    }
    if (status !== undefined && !STATUS.includes(status)) {
      return res.status(400).json({ error: `status harus salah satu dari: ${STATUS.join(", ")}` });
    }

    const values = [];
    const where = status ? "WHERE pj.status = $1" : "";
    if (status) values.push(status);
    const limitParameter = values.length + 1;
    const offsetParameter = values.length + 2;
    values.push(limit, (page - 1) * limit);

    const dataQuery = `${selectDetail} ${where} ORDER BY pj.id DESC LIMIT $${limitParameter} OFFSET $${offsetParameter}`;
    const countQuery = `SELECT COUNT(*)::int AS total FROM penjualan pj ${where}`;
    const countValues = status ? [status] : [];
    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, values),
      pool.query(countQuery, countValues)
    ]);

    res.json({
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total: countResult.rows[0].total,
        total_pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "id harus berupa bilangan bulat positif" });

    const result = await pool.query(`${selectDetail} WHERE pj.id = $1`, [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Penjualan tidak ditemukan" });

    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { pelanggan_id, produk_id, jumlah, tanggal } = req.body || {};
    const pelangganId = parsePositiveInteger(pelanggan_id);
    const produkId = parsePositiveInteger(produk_id);
    const jumlahValid = parsePositiveInteger(jumlah);

    if (!pelangganId || !produkId || !jumlahValid) {
      return res.status(400).json({ error: "pelanggan_id, produk_id, dan jumlah wajib berupa bilangan bulat positif" });
    }
    if (tanggal !== undefined && !isDate(tanggal)) {
      return res.status(400).json({ error: "tanggal harus menggunakan format YYYY-MM-DD" });
    }

    const result = await pool.query(
      `INSERT INTO penjualan (pelanggan_id, produk_id, jumlah, tanggal, total, status)
       SELECT $1, pr.id, $3, COALESCE($4::date, CURRENT_DATE), ROUND(pr.harga * $3, 2), 'pending'
       FROM produk pr
       WHERE pr.id = $2
         AND EXISTS (SELECT 1 FROM pelanggan WHERE id = $1)
       RETURNING id`,
      [pelangganId, produkId, jumlahValid, tanggal || null]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: "pelanggan_id atau produk_id tidak ditemukan" });
    }

    const detail = await pool.query(`${selectDetail} WHERE pj.id = $1`, [result.rows[0].id]);
    res.status(201).location(`/api/penjualan/${result.rows[0].id}`).json({ data: detail.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const { status } = req.body || {};

    if (!id) return res.status(400).json({ error: "id harus berupa bilangan bulat positif" });
    if (!STATUS.includes(status)) {
      return res.status(400).json({ error: `status harus salah satu dari: ${STATUS.join(", ")}` });
    }

    const current = await pool.query("SELECT status FROM penjualan WHERE id = $1", [id]);
    if (current.rowCount === 0) return res.status(404).json({ error: "Penjualan tidak ditemukan" });

    const statusSekarang = current.rows[0].status;
    if (!TRANSISI_STATUS[statusSekarang]?.includes(status)) {
      return res.status(409).json({
        error: `Status tidak dapat diubah dari '${statusSekarang}' menjadi '${status}'`
      });
    }

    await pool.query("UPDATE penjualan SET status = $1 WHERE id = $2", [status, id]);
    const detail = await pool.query(`${selectDetail} WHERE pj.id = $1`, [id]);
    res.json({ data: detail.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "id harus berupa bilangan bulat positif" });

    const result = await pool.query("DELETE FROM penjualan WHERE id = $1", [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Penjualan tidak ditemukan" });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
