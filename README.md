# API Penjualan — Lab 03 Contract-First

Backend REST berbasis Express dan Neon PostgreSQL. Kontrak API ditulis di
[`openapi.yaml`](./openapi.yaml) dan dipakai langsung untuk halaman Swagger UI.

## Endpoint

| Method | Path | Kegunaan |
|---|---|---|
| GET | `/api/penjualan` | Daftar penjualan, pagination, dan filter status |
| GET | `/api/penjualan/{id}` | Detail satu penjualan |
| POST | `/api/penjualan` | Membuat penjualan; `total` dihitung dari harga produk |
| PATCH | `/api/penjualan/{id}/status` | Mengubah status sesuai alur transaksi |
| DELETE | `/api/penjualan/{id}` | Menghapus penjualan |

## Menjalankan secara lokal

1. Pastikan ketiga tabel sudah ada di Neon. Untuk database baru gunakan
   `database/schema.sql`. Untuk database lama, jalankan
   `database/migration_add_status.sql` agar kolom `penjualan.status` tersedia.
2. Salin `.env.example` menjadi `.env`, lalu isi `DATABASE_URL` dengan connection
   string Neon. Jangan commit file `.env`.
3. Jalankan:

   ```bash
   npm install
   npm run check
   npm start
   ```

4. Buka `http://localhost:3000/docs`. Dokumen YAML mentah tersedia di
   `http://localhost:3000/openapi.yaml` dan juga dapat ditempel ke Swagger Editor.

Contoh membuat transaksi:

```bash
curl -X POST http://localhost:3000/api/penjualan \
  -H "Content-Type: application/json" \
  -d '{"pelanggan_id":1,"produk_id":1,"jumlah":2}'
```

## Persiapan deployment

### Render

Repository sudah memiliki `render.yaml`. Buat Blueprint/Web Service dari
repository, lalu isi environment variable `DATABASE_URL` di dashboard Render.

### Vercel

Repository sudah memiliki `vercel.json`. Vercel mendeteksi aplikasi Express dari
`src/app.js` dan menjalankannya sebagai satu Vercel Function. Import repository ke
Vercel, kemudian tambahkan environment variable `DATABASE_URL`.

Untuk mencoba runtime Vercel secara lokal setelah login ke Vercel CLI:

```bash
npx vercel login
npm run dev:vercel
```

Sesudah deploy, ganti server placeholder `https://your-app.vercel.app` di
`openapi.yaml` dengan URL yang sebenarnya agar fitur **Try it out** menuju server
deployment.

## Catatan desain

- Query memakai parameter `$1`, `$2`, dan seterusnya untuk mencegah SQL injection.
- Field `total` tidak diterima dari client; server menghitungnya dari
  `produk.harga * jumlah`.
- Penjualan baru selalu berstatus `pending`.
- Alur status: `pending → disetujui → dikirim`, sedangkan `pending` atau
  `disetujui` dapat diubah menjadi `dibatalkan`.
- Aplikasi tidak membuat atau mengubah skema saat startup. Perubahan skema tetap
  dilakukan melalui file SQL agar terkontrol.
