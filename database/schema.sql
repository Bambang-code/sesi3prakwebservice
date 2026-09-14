-- Skema tabel yang digunakan oleh API Penjualan.
CREATE TABLE pelanggan (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    no_telepon VARCHAR(20),
    kota VARCHAR(50)
);

CREATE TABLE produk (
    id SERIAL PRIMARY KEY,
    nama_produk VARCHAR(100) NOT NULL,
    kategori VARCHAR(50),
    harga NUMERIC(12,2) NOT NULL,
    stok INT DEFAULT 0
);

CREATE TABLE penjualan (
    id SERIAL PRIMARY KEY,
    pelanggan_id INT REFERENCES pelanggan(id),
    produk_id INT REFERENCES produk(id),
    jumlah INT NOT NULL,
    tanggal DATE DEFAULT CURRENT_DATE,
    total NUMERIC(14,2),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
);
