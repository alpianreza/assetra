# Assetra

Assetra adalah aplikasi manajemen inventaris dan compliance checklist berbasis QR untuk mengelola aset, PIC, periode pemeriksaan, evidence, monitoring progres, dan laporan dalam satu sistem.

## Daftar Isi

- [Fitur utama](#fitur-utama)
- [Teknologi](#teknologi)
- [Persyaratan sistem](#persyaratan-sistem)
- [Instalasi lokal](#instalasi-lokal)
- [Konfigurasi environment dan URL](#konfigurasi-environment-dan-url)
- [Membuat administrator](#membuat-administrator)
- [Menjalankan aplikasi](#menjalankan-aplikasi)
- [Urutan konfigurasi awal](#urutan-konfigurasi-awal)
- [Notifikasi](#notifikasi)
- [QR Center dan perubahan URL](#qr-center-dan-perubahan-url)
- [Checklist dan periode](#checklist-dan-periode)
- [Evidence Center](#evidence-center)
- [Role dan permission](#role-dan-permission)
- [Penyimpanan file](#penyimpanan-file)
- [Build dan deployment produksi](#build-dan-deployment-produksi)
- [Backup dan restore](#backup-dan-restore)
- [Update aplikasi](#update-aplikasi)
- [Troubleshooting](#troubleshooting)

## Fitur Utama

- Login berbasis session cookie dan CSRF.
- Home untuk pengguna dan Dashboard analitik.
- Monitoring progres checklist berdasarkan PIC.
- Master Data: area, kategori, jenis item, dan pertanyaan checklist.
- Inventaris dengan nomor otomatis, foto, status, area, dan PIC.
- QR code untuk setiap inventaris dan regenerasi QR saat URL berubah.
- Pelaksanaan checklist berdasarkan periode dan hari kerja.
- Status jawaban Sesuai, Tidak Sesuai, dan N/A.
- Upload evidence foto pada jawaban checklist.
- Evidence Center untuk melihat seluruh dokumentasi pemeriksaan.
- Riwayat serta hasil checklist read-only untuk auditor.
- Role dan permission terperinci.
- Pengguna dengan foto profil, telepon, status, dan role.
- Hari kerja mingguan dan pengecualian hari libur.
- Notifikasi checklist pending dan terlambat untuk PIC.
- Print Center, export, dan label QR.
- Pengaturan nama perusahaan, logo, dan footer laporan.
- Tema light/dark/system, warna, layout, sidebar, card, radius, LTR/RTL.
- Bahasa Indonesia dan English.

## Teknologi

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, TanStack Query.
- **Backend:** NestJS 10, TypeScript, Prisma ORM.
- **Database:** MySQL.
- **Package manager:** pnpm workspace.
- **Runtime:** Node.js 20.10 atau lebih baru.

Struktur utama:

```text
assetra/
├── apps/
│   ├── api/       # NestJS API, Prisma, migration, dan file storage
│   └── web/       # React/Vite
├── docs/
├── .env.example
├── package.json
└── pnpm-workspace.yaml
```

## Persyaratan Sistem

Pastikan perangkat telah memiliki:

1. Git.
2. Node.js minimal `20.10.0`.
3. pnpm `9.x`.
4. MySQL 8.x atau MariaDB yang kompatibel dengan Prisma MySQL.
5. Akses tulis ke folder `apps/api/storage`.

Cek versi:

```bash
node --version
pnpm --version
mysql --version
```

Jika pnpm belum tersedia:

```bash
corepack enable
corepack prepare pnpm@9.0.0 --activate
```

## Instalasi Lokal

### 1. Clone repository

```bash
git clone https://github.com/alpianreza/assetra.git
cd assetra
git checkout master
```

### 2. Instal dependency

```bash
pnpm install
```

### 3. Buat database

Contoh melalui MySQL CLI:

```sql
CREATE DATABASE assetra_dev
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Untuk XAMPP, database juga dapat dibuat melalui phpMyAdmin dengan nama `assetra_dev`.

### 4. Buat file environment

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Linux/macOS:

```bash
cp .env.example .env
```

Kemudian sesuaikan `.env`.

### 5. Terapkan migration dan generate Prisma Client

Development:

```bash
pnpm --filter api db:migrate
pnpm --filter api db:generate
```

Production/CI:

```bash
pnpm --filter api db:migrate-deploy
pnpm --filter api db:generate
```

> Jangan menjalankan `prisma migrate reset` pada database yang berisi data produksi karena seluruh data dapat terhapus.

### 6. Seed permission dan sesi checklist

```bash
pnpm --filter api seed:permissions
pnpm --filter api seed:checklist
```

Seed permission bersifat aman untuk dijalankan ulang karena menggunakan upsert.

## Konfigurasi Environment dan URL

Contoh `.env`:

```env
NODE_ENV=development
APP_NAME=Assetra
APP_VERSION=0.0.1
API_PORT=3000
FRONTEND_URL=http://localhost:5173
DATABASE_URL=mysql://root:@localhost:3306/assetra_dev
```

Penjelasan:

| Variabel | Contoh | Keterangan |
| --- | --- | --- |
| `NODE_ENV` | `development` | Gunakan `production` di server HTTPS. |
| `APP_NAME` | `Assetra` | Nama aplikasi. |
| `APP_VERSION` | `0.0.1` | Versi aplikasi. |
| `API_PORT` | `3000` | Port NestJS API. |
| `FRONTEND_URL` | `http://localhost:5173` | URL frontend yang diizinkan oleh CORS dan dimasukkan ke QR. |
| `DATABASE_URL` | `mysql://root:@localhost:3306/assetra_dev` | Koneksi MySQL Prisma. |

### Aturan penting URL

- `FRONTEND_URL` harus berisi origin frontend, bukan endpoint API.
- Jangan menambahkan `/api/v1` ke `FRONTEND_URL`.
- Development default:
  - Web: `http://localhost:5173`
  - API: `http://localhost:3000/api/v1`
- Production disarankan menggunakan satu domain dan HTTPS, misalnya:

```env
NODE_ENV=production
FRONTEND_URL=https://assetra.perusahaan.com
API_PORT=3000
DATABASE_URL=mysql://assetra_user:password-kuat@127.0.0.1:3306/assetra
```

Frontend memanggil API melalui path relatif `/api/v1`. Karena itu, di production arahkan `/api/` ke API NestJS menggunakan reverse proxy.

### Mengubah port API saat development

Proxy Vite saat ini mengarah ke `http://localhost:3000`. Jika `API_PORT` diubah, sesuaikan juga target pada:

```text
apps/web/vite.config.ts
```

Contoh:

```ts
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    },
  },
}
```

## Membuat Administrator

Setelah permission selesai di-seed:

```bash
pnpm --filter api admin:create
```

Isi:

- Nama lengkap.
- Username.
- Email.
- Nomor telepon, opsional.
- Password.

Script akan membuat atau menggunakan role **Super Admin**. Jalankan `seed:permissions` terlebih dahulu agar role tersebut memperoleh seluruh permission.

## Menjalankan Aplikasi

### Satu perintah

```bash
pnpm dev
```

### Terminal terpisah

Terminal API:

```bash
pnpm --filter api dev
```

Terminal frontend:

```bash
pnpm --filter web dev
```

Buka:

```text
http://localhost:5173
```

API menggunakan prefix:

```text
http://localhost:3000/api/v1
```

## Urutan Konfigurasi Awal

Setelah login sebagai Super Admin, lakukan konfigurasi berikut:

1. **Pengaturan Organisasi**
   - Isi nama perusahaan, singkatan, alamat, telepon, email, website, footer laporan, dan logo.
2. **Role & Permission**
   - Buat role Admin, PIC/User, dan Auditor sesuai kebutuhan.
3. **Pengguna**
   - Buat akun, isi nomor telepon, pilih role, dan unggah foto pengguna.
4. **Hari Kerja & Libur**
   - Atur hari kerja mingguan.
   - Tambahkan tanggal libur atau pengecualian hari kerja.
5. **Master Data**
   - Buat area.
   - Buat kategori dan kode kategori.
   - Buat jenis item, kode item, frekuensi checklist, serta aturan N/A.
6. **Checklist Master**
   - Tambahkan pertanyaan untuk setiap jenis item.
   - Tentukan pertanyaan wajib dan kebutuhan foto.
7. **Inventaris**
   - Pilih kategori, jenis item, area, dan PIC.
   - Nomor inventaris dibuat otomatis dari kode kategori, kode item, dan nomor urut.
8. **QR Center**
   - Pastikan base URL benar, lalu generate atau regenerate QR.
9. **Pelaksanaan Checklist**
   - PIC membuka detail inventaris melalui daftar atau scan QR.
10. **Monitoring, Evidence, dan Laporan**
   - Pantau progres PIC, bukti foto, hasil pemeriksaan, dan cetak laporan.

## Notifikasi

### Notifikasi dalam aplikasi

Notifikasi in-app aktif otomatis dan tidak membutuhkan API key.

Cara kerjanya:

1. Pengguna harus ditetapkan sebagai PIC pada inventaris.
2. Inventaris harus memiliki jenis item dan checklist master.
3. Sistem memeriksa periode checklist yang berstatus `pending` atau `late`.
4. Notifikasi muncul pada ikon lonceng di header.
5. Badge merah menunjukkan jumlah notifikasi yang belum dibaca.
6. Daftar diperbarui ketika lonceng dibuka dan secara berkala setiap satu menit.
7. Klik notifikasi untuk membuka detail inventaris.

Halaman lengkap tersedia di:

```text
/notifications
```

Pengguna dapat:

- Membaca notifikasi terbaru.
- Memfilter notifikasi belum dibaca.
- Menandai satu atau seluruh notifikasi sebagai sudah dibaca.
- Menghapus notifikasi.

Jika notifikasi tidak muncul, periksa:

- Pengguna sudah menjadi PIC inventaris.
- Inventaris memiliki checklist master aktif.
- Ada periode yang belum selesai atau terlambat.
- Hari tersebut tidak dinonaktifkan oleh konfigurasi hari kerja/libur.
- API dan database aktif.
- Browser masih memiliki session login yang valid.

### WhatsApp dan email

Struktur provider WhatsApp dan email sudah tersedia di:

```text
apps/api/src/modules/notification/providers/whatsapp.provider.ts
apps/api/src/modules/notification/providers/email.provider.ts
```

Namun pada versi saat ini kedua provider tersebut masih berupa adapter/log development dan **belum mengirim pesan ke layanan eksternal**. Mengisi token SMTP atau WhatsApp saja belum cukup sebelum implementasi provider disambungkan ke vendor, misalnya Fonnte untuk WhatsApp dan SMTP transporter untuk email.

Notifikasi in-app tetap berfungsi tanpa WhatsApp atau SMTP.

## QR Center dan Perubahan URL

QR inventaris mengarah ke:

```text
{FRONTEND_URL}/q/{publicId}
```

Contoh:

```text
https://assetra.perusahaan.com/q/cm123abc
```

Jika domain, protocol, atau port frontend berubah:

1. Ubah `FRONTEND_URL` pada `.env`.
2. Restart API.
3. Login sebagai pengguna dengan permission QR.
4. Buka **QR Center**.
5. Pilih inventaris atau seluruh inventaris.
6. Klik **Regenerate QR**.
7. Cetak ulang label yang memakai URL lama.

QR disimpan di:

```text
apps/api/storage/qr
```

Scan QR membuka detail inventaris terlebih dahulu. Pengguna yang belum login diarahkan ke login, sedangkan halaman publik QR menggunakan route `/q/:publicId`.

## Checklist dan Periode

Checklist bergantung pada:

- Frekuensi jenis item.
- Checklist master aktif.
- Assignment template ke inventaris.
- Hari kerja mingguan.
- Holiday override.
- PIC inventaris.
- Permission `compliance.execute`.

Alur pengisian:

1. Buka detail inventaris atau scan QR.
2. Pilih periode checklist.
3. Isi seluruh pertanyaan.
4. Tambahkan catatan atau foto untuk status Tidak Sesuai.
5. Pertanyaan yang mewajibkan foto tidak dapat dikirim tanpa foto.
6. Submit checklist.
7. Hasil tersimpan sebagai riwayat read-only.

Auditor dengan permission `compliance.view` dapat melihat hasil tanpa mengubah jawaban.

## Evidence Center

Setiap foto yang dikirim bersama jawaban checklist dicatat sebagai evidence dan terhubung dengan:

- Checklist log.
- Inventaris.
- Pertanyaan.
- Periode.
- Status jawaban.
- Pengguna pengunggah.
- Nama, tipe, dan ukuran file.

Akses melalui:

```text
Sidebar → Reporting → Evidence Center
```

atau:

```text
/evidence
```

Evidence Center menyediakan pencarian, filter periode, preview, download, status temuan, serta link ke detail inventaris.

## Role dan Permission

Permission utama:

| Fitur | Permission |
| --- | --- |
| Pengguna | `users.view`, `users.create`, `users.update`, `users.delete` |
| Role | `roles.view`, `roles.manage` |
| Area | `master.area.view`, `master.area.manage` |
| Kategori | `master.category.view`, `master.category.manage` |
| Jenis Item | `master.item_type.view`, `master.item_type.manage` |
| Inventaris | `inventory.view`, `inventory.create`, `inventory.update`, `inventory.delete` |
| Checklist Master | `checklist_template.view`, `checklist_template.create`, `checklist_template.update`, `checklist_template.delete` |
| Compliance | `compliance.view`, `compliance.execute`, `compliance.manage` |
| Notifikasi eksternal | `notification.view`, `notification.manage`, `notification.send` |
| QR Center | `qr.view`, `qr.print` |
| Organisasi | `settings.organization.view`, `settings.organization.manage` |
| Hari Kerja/Libur | `settings.working_day.manage`, `settings.holiday.manage` |
| Laporan | `reports.view`, `reports.export` |
| Dashboard | `dashboard.view` |

Rekomendasi:

- **Super Admin:** seluruh permission.
- **Admin Operasional:** master data, inventory, compliance, QR, monitoring, evidence, dan laporan.
- **PIC/User:** inventory view dan `compliance.execute`.
- **Auditor:** inventory view, `compliance.view`, evidence, dan laporan tanpa permission execute/update.

## Penyimpanan File

File upload disimpan pada filesystem API. Ketika aplikasi dijalankan melalui package `api`, lokasi umumnya:

```text
apps/api/storage/
├── checklist/   # Foto evidence checklist
├── inventory/   # Foto inventaris
├── qr/          # QR SVG
├── users/       # Foto pengguna
└── ...          # Logo/branding sesuai konfigurasi
```

Catatan:

- Folder dibuat otomatis ketika upload pertama dilakukan.
- User proses Node.js harus memiliki izin read/write.
- Jangan menghapus folder storage saat deploy.
- Pada Docker/Kubernetes, pasang persistent volume untuk storage.
- Backup database tanpa folder storage akan menghasilkan referensi file yang tidak dapat dibuka.

Linux:

```bash
mkdir -p apps/api/storage
chown -R www-data:www-data apps/api/storage
chmod -R 750 apps/api/storage
```

Sesuaikan user `www-data` dengan user yang menjalankan Node.js.

## Build dan Deployment Produksi

### Build

```bash
pnpm install --frozen-lockfile
pnpm --filter api db:generate
pnpm build
pnpm --filter api db:migrate-deploy
```

Output frontend:

```text
apps/web/dist
```

Jalankan API dari direktori API agar lokasi storage konsisten:

```bash
cd apps/api
node dist/main.js
```

Gunakan PM2, systemd, Docker, atau process manager lain agar API otomatis restart.

### Contoh Nginx

```nginx
server {
    listen 80;
    server_name assetra.perusahaan.com;

    root /var/www/assetra/apps/web/dist;
    index index.html;
    client_max_body_size 10m;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Untuk production:

- Gunakan HTTPS.
- Set `NODE_ENV=production` agar cookie session memakai flag secure.
- Pastikan `FRONTEND_URL` menggunakan URL HTTPS yang sama.
- Jangan membuka port MySQL ke internet.
- Gunakan user database khusus dengan password kuat.
- Batasi akses ke `.env` dan folder storage.

## Backup dan Restore

### Backup database

```bash
mysqldump -u root -p assetra_dev > assetra-backup.sql
```

### Backup storage

Linux/macOS:

```bash
tar -czf assetra-storage.tar.gz apps/api/storage
```

PowerShell:

```powershell
Compress-Archive -Path .\apps\api\storage -DestinationPath .\assetra-storage.zip
```

### Restore database

```bash
mysql -u root -p assetra_dev < assetra-backup.sql
```

Restore folder storage ke lokasi yang sama sebelum aplikasi dijalankan.

## Update Aplikasi

Prosedur aman:

```powershell
git pull origin master
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
pnpm install
pnpm --filter api db:migrate
pnpm --filter api db:generate
pnpm dev
```

Production:

```bash
git pull origin master
pnpm install --frozen-lockfile
pnpm --filter api db:generate
pnpm build
pnpm --filter api db:migrate-deploy
# restart service/PM2 setelah migration berhasil
```

Sebelum update production, backup database dan `apps/api/storage`.

## Pemeriksaan Kualitas

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Troubleshooting

### Halaman login blank atau frontend tidak dapat mengakses API

- Pastikan API berjalan pada port `3000`.
- Pastikan frontend berjalan pada port `5173`.
- Periksa `FRONTEND_URL`.
- Lihat tab Network dan Console browser.
- Pastikan endpoint memakai prefix `/api/v1`.

### CORS atau session cookie gagal

- `FRONTEND_URL` harus sama persis dengan origin browser.
- Jangan mencampur `localhost` dan alamat IP dalam satu sesi.
- Production harus memakai HTTPS karena cookie secure aktif saat `NODE_ENV=production`.
- Reverse proxy harus meneruskan header `Host` dan `X-Forwarded-Proto`.

### Prisma `EPERM query_engine-windows.dll.node`

Tutup seluruh proses Node sebelum generate:

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
pnpm --filter api db:generate
```

### Migration gagal

- Baca nama migration dan query yang gagal.
- Jangan gunakan `migrate reset` pada database berisi data.
- Pastikan schema lokal dan migration repository sudah terbaru.
- Backup database sebelum mengubah migration secara manual.

### Foto atau evidence tidak tampil

- Pastikan file ada di `apps/api/storage`.
- Pastikan proses API dijalankan dari working directory yang konsisten.
- Periksa permission folder.
- Pastikan database dan folder storage berasal dari backup yang sama.
- Periksa endpoint file melalui tab Network browser.

### QR mengarah ke domain lama

- Perbarui `FRONTEND_URL`.
- Restart API.
- Buka QR Center dan lakukan regenerate.
- Cetak ulang QR yang sudah berubah.

### Notifikasi tidak muncul

- Pastikan pengguna adalah PIC.
- Pastikan ada checklist pending/late pada periode aktif.
- Buka ikon lonceng untuk memicu refresh.
- Tunggu refresh otomatis maksimal satu menit.
- Pastikan API tidak menampilkan error pada modul notification/compliance.

### Checklist tidak dapat disimpan

- Semua pertanyaan wajib harus dijawab.
- Status N/A harus diizinkan oleh jenis item.
- Jawaban Tidak Sesuai membutuhkan catatan atau foto.
- Pertanyaan `requirePhoto` membutuhkan evidence foto.
- Periode masa depan, hari libur, atau periode kedaluwarsa tidak dapat diisi.
- Pastikan user memiliki `compliance.execute`.

## Lisensi dan Penggunaan

Assetra adalah repository privat/komersial. Distribusi, deployment, dan penggunaan mengikuti kebijakan pemilik repository dan organisasi terkait.
