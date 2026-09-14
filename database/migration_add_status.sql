-- Jalankan pada database lama yang belum memiliki kolom status.
ALTER TABLE penjualan
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';

