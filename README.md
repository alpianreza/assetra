# Assetra

Assetra adalah aplikasi manajemen inventaris dan compliance checklist berbasis QR. Aplikasi mencakup inventaris, PIC, periode pemeriksaan, checklist, evidence, monitoring progres, notifikasi, QR Center, dan laporan.

## Arsitektur

Assetra tetap menggunakan arsitektur berikut:

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router, TanStack Query.
- **Backend:** NestJS, TypeScript, Prisma, MySQL, REST API.
- **Authentication:** session cookie, CSRF, dan RBAC.

### Development

Development menjalankan dua dev server agar HMR tetap tersedia:

```text
Browser → Vite :5173 → /api proxy → NestJS :3000
```

### Production — Single Server

Production hanya menjalankan **satu process NestJS**:

```text
Browser
   │
   ▼
NestJS :PORT
   ├── /api/v1/*  → REST API
   ├── file routes → controller/authorization existing
   └── /*          → React build + SPA fallback
```

`pnpm build` menghasilkan:

```text
apps/web/dist/       # React production build
apps/api/dist/       # NestJS production build
```

`pnpm start:prod` hanya menjalankan NestJS. Vite tidak dijalankan di production.

## Fitur Utama

- Login dengan session cookie dan CSRF.
- Home dan Dashboard analitik.
- Monitoring progres berdasarkan PIC.
- Master Data: area, kategori, jenis item, dan Checklist Master.
- Inventaris dengan nomor otomatis, foto, status, PIC, dan QR.
- Checklist berdasarkan periode, frekuensi, hari kerja, dan hari libur.
- Evidence foto dan Evidence Center.
- Riwayat hasil checklist read-only untuk auditor.
- Role dan permission.
- Pengguna dan foto profil.
- QR Center, regenerasi QR, Print Center, serta export.
- Notifikasi in-app untuk checklist pending/terlambat.
- Pengaturan organisasi, tema, dan bahasa Indonesia/English.

## Persyaratan

- Git.
- Node.js minimal `20.10.0`.
- pnpm `9.x`.
- MySQL 8.x atau MariaDB yang kompatibel dengan Prisma MySQL.
- Hak baca/tulis untuk `apps/api/storage`.

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

## Environment

Salin contoh environment ke root repository:

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Linux/macOS:

```bash
cp .env.example .env
```

Contoh development:

```env
NODE_ENV=development
PORT=3000
API_PORT=3000
APP_NAME=Assetra
APP_VERSION=0.0.1
APP_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
SESSION_SECRET=replace-with-a-long-random-development-secret
DATABASE_URL=mysql://root:@localhost:3306/assetra_dev
```

Contoh production single-server melalui IP LAN:

```env
NODE_ENV=production
PORT=3000
APP_NAME=Assetra
APP_VERSION=1.0.0
APP_URL=http://192.168.1.20:3000
FRONTEND_URL=http://192.168.1.20:3000
CORS_ORIGIN=
SESSION_SECRET=ganti-dengan-random-string-panjang-dan-rahasia
DATABASE_URL=mysql://assetra_user:password-kuat@127.0.0.1:3306/assetra
```

Contoh production dengan domain HTTPS:

```env
NODE_ENV=production
PORT=3000
APP_URL=https://assetra.perusahaan.com
FRONTEND_URL=https://assetra.perusahaan.com
CORS_ORIGIN=
SESSION_SECRET=ganti-dengan-random-string-panjang-dan-rahasia
DATABASE_URL=mysql://assetra_user:password-kuat@127.0.0.1:3306/assetra
```

### Keterangan Environment

| Variabel | Keterangan |
| --- | --- |
| `NODE_ENV` | `development` atau `production`. Production mengaktifkan secure cookie. |
| `PORT` | Port single server NestJS. Prioritas utama. |
| `API_PORT` | Alias kompatibilitas instalasi lama; digunakan jika `PORT` tidak diisi. |
| `APP_URL` | URL publik Assetra dan base URL QR. |
| `FRONTEND_URL` | Alias kompatibilitas untuk instalasi lama. |
| `CORS_ORIGIN` | Origin lintas domain yang diizinkan, dapat dipisahkan koma. Kosongkan untuk same-origin production. |
| `DATABASE_URL` | Connection string MySQL Prisma. |
| `SESSION_SECRET` | Secret deployment yang harus unik dan tidak dikomit. Auth existing tetap memakai opaque session token yang disimpan di database, bukan JWT localStorage. |

Root `.env` dimuat secara portable dari monorepo. Source code tidak memiliki hardcoded path Windows.

> Jangan menambahkan `/api/v1` ke `APP_URL`. Gunakan origin, misalnya `https://assetra.perusahaan.com`.

## Fresh Installation — Development

### 1. Clone dan install

```bash
git clone https://github.com/alpianreza/assetra.git
cd assetra
git checkout master
pnpm install
```

### 2. Buat database

```sql
CREATE DATABASE assetra_dev
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

### 3. Siapkan `.env`

Salin `.env.example`, lalu sesuaikan `DATABASE_URL`, `PORT`, dan URL development.

### 4. Migration, Prisma, dan seed

```bash
pnpm db:migrate
pnpm db:generate
pnpm seed:permissions
pnpm seed:checklist
pnpm admin:create
```

`admin:create` meminta nama, username, email, telepon opsional, dan password.

### 5. Jalankan development

```bash
pnpm dev
```

Perintah tersebut menjalankan Vite dan NestJS secara paralel:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000/api/v1`

Untuk menjalankan secara terpisah:

```bash
pnpm --filter @assetra/api dev
pnpm --filter @assetra/web dev
```

Vite proxy tetap meneruskan `/api` ke NestJS. Frontend memakai API relatif `/api/v1`, bukan URL `localhost:3000` yang ditanam ke production bundle.

## Fresh Installation — Production Single Server

### 1. Clone dan install

```bash
git clone https://github.com/alpianreza/assetra.git
cd assetra
git checkout master
pnpm install --frozen-lockfile
```

### 2. Siapkan MySQL dan `.env`

- Buat database MySQL.
- Salin `.env.example` menjadi `.env`.
- Set `NODE_ENV=production`.
- Set `PORT`.
- Set `APP_URL` ke URL/IP yang dipakai operator.
- Kosongkan `CORS_ORIGIN` untuk same-origin.
- Set `DATABASE_URL`.
- Ganti `SESSION_SECRET` dengan nilai panjang dan acak.

### 3. Generate, migration, dan initial seed

```bash
pnpm db:generate
pnpm db:migrate-deploy
pnpm seed:permissions
pnpm seed:checklist
pnpm admin:create
```

`admin:create` hanya diperlukan saat membuat administrator pertama.

### 4. Build frontend dan backend

```bash
pnpm build
```

Build harus menghasilkan `apps/web/dist/index.html`. Production start akan berhenti dengan pesan yang jelas jika build React belum tersedia.

### 5. Jalankan satu production process

```bash
pnpm start:prod
```

Buka:

```text
http://SERVER_IP:PORT
```

Contoh:

```text
http://192.168.1.20:3000
```

Pada production, React sudah berupa static assets dan dilayani oleh NestJS. Tidak perlu menjalankan:

```text
pnpm --filter @assetra/web dev
vite preview
frontend server kedua
```

Command final production:

```bash
pnpm build
pnpm start:prod
```

## Cara NestJS Melayani React

Single-server diaktifkan hanya saat:

```env
NODE_ENV=production
```

NestJS melakukan:

1. Resolve build frontend secara portable dari struktur monorepo ke `apps/web/dist`.
2. Melayani file static hasil Vite menggunakan adapter resmi NestJS Express.
3. Mempertahankan global API prefix `/api/v1`.
4. Mendaftarkan SPA fallback setelah seluruh controller NestJS selesai diinisialisasi.
5. Mengirim `index.html` untuk route React Router yang tidak memiliki ekstensi file.

Tidak ada absolute path seperti `C:\xampp\htdocs\assetra` di source code.

## API dan SPA Fallback

API tetap berada di:

```text
/api/v1/*
```

Contoh:

```text
/api/v1/auth/login
/api/v1/auth/me
/api/v1/inventory
/api/v1/compliance
/api/v1/reports
/api/v1/dashboard
```

SPA fallback melayani direct access dan refresh untuk route seperti:

```text
/
/login
/dashboard
/inventory
/inventory/:id
/compliance
/qr
/q/:publicId
/reports
/print-center
/master/areas
/master/categories
/master/item-types
/settings/organization
```

Fallback tidak menangkap:

- `/api` dan `/api/*`.
- `/storage` dan `/storage/*`.
- Request file yang memiliki ekstensi, misalnya `.js`, `.css`, `.svg`, atau `.png`.

Dengan demikian:

```text
GET /inventory          → apps/web/dist/index.html
GET /api/v1/inventory   → NestJS InventoryController
```

## Authentication Same-Origin

Authentication tidak diubah:

- Session cookie `assetra_session` tetap httpOnly.
- CSRF cookie dan header `X-CSRF-Token` tetap digunakan.
- Login, `/api/v1/auth/me`, logout, dan RBAC tetap memakai implementasi existing.
- Tidak ada JWT di localStorage.
- Tidak ada hardcoded user atau Super Admin.

Karena frontend dan API berada pada origin yang sama di production, browser mengirim cookie dan CSRF request tanpa konfigurasi cross-origin tambahan.

Saat `NODE_ENV=production`, cookie memakai flag `secure`; gunakan HTTPS untuk deployment internet/domain. Untuk pengujian LAN HTTP, browser tertentu dapat menolak secure cookie. Gunakan HTTPS pada deployment production sesungguhnya.

## Storage dan File

File aplikasi tetap berada di storage existing, umumnya:

```text
apps/api/storage/
├── checklist/
├── inventory/
├── qr/
├── users/
└── organization/ atau lokasi branding existing
```

Assetra **tidak mengekspos seluruh folder storage sebagai public static directory**. File tetap diakses melalui endpoint/controller existing agar aturan public atau authorization tetap dipertahankan, misalnya evidence, foto inventaris, foto pengguna, QR, dan logo organisasi.

SPA fallback juga mengecualikan `/storage/*`; request tersebut tidak pernah berubah menjadi `index.html`.

Pastikan process Node.js memiliki izin baca/tulis:

```bash
mkdir -p apps/api/storage
chmod -R 750 apps/api/storage
```

Storage harus ikut dibackup dan dibuat persistent. Jangan hanya membackup database.

## Deployment Windows/XAMPP

Contoh lokasi operator:

```text
C:\xampp\htdocs\assetra
```

Path ini hanya contoh dokumentasi dan tidak ditanam ke source code.

### 1. Jalankan MySQL XAMPP

Aktifkan MySQL melalui XAMPP Control Panel, lalu buat database melalui phpMyAdmin.

### 2. Install dan setup

PowerShell:

```powershell
cd C:\xampp\htdocs\assetra
pnpm install
Copy-Item .env.example .env
pnpm db:generate
pnpm db:migrate-deploy
pnpm seed:permissions
pnpm seed:checklist
pnpm admin:create
```

### 3. Build dan start

```powershell
pnpm build
pnpm start:prod
```

Jika `.env` berisi:

```env
PORT=3000
APP_URL=http://192.168.1.20:3000
```

maka buka:

```text
http://192.168.1.20:3000
```

Hanya satu process NestJS production yang berjalan. Apache XAMPP tidak diperlukan untuk menyajikan React.

## Reverse Proxy Opsional

Nginx atau Apache **bukan requirement** untuk menjalankan frontend. Reverse proxy hanya diperlukan jika menggunakan domain, HTTPS, SSL termination, atau port 80/443.

```text
Internet/LAN
     │
Nginx/Apache
     │
NestJS
   ├── React static build
   └── /api/v1 REST API
```

### Contoh Nginx

Nginx meneruskan **seluruh request** ke satu NestJS server; Nginx tidak menjalankan React sebagai server kedua.

```nginx
server {
    listen 80;
    server_name assetra.perusahaan.com;
    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Untuk HTTPS, pasang sertifikat pada Nginx/Apache dan set:

```env
APP_URL=https://assetra.perusahaan.com
FRONTEND_URL=https://assetra.perusahaan.com
CORS_ORIGIN=
```

## QR Center dan Perubahan URL

QR menggunakan:

```text
{APP_URL}/q/{publicId}
```

Jika IP, domain, protocol, atau port berubah:

1. Ubah `APP_URL` pada `.env`.
2. Restart NestJS.
3. Buka QR Center.
4. Jalankan regenerate QR.
5. Cetak ulang label yang masih berisi URL lama.

`FRONTEND_URL` tetap didukung sebagai alias kompatibilitas.

## Notifikasi

### In-app

Notifikasi in-app aktif tanpa provider eksternal. Pengguna yang menjadi PIC menerima pengingat checklist pending atau terlambat melalui ikon lonceng dan halaman `/notifications`.

### Email/WhatsApp

```text
Email/WhatsApp provider configuration:
Pending production provider integration.
```

Provider saat ini masih stub/log development dan belum production-ready. Task single-server ini tidak mengimplementasikan atau mengubah provider Email/WhatsApp.

## Urutan Konfigurasi Assetra

1. Pengaturan organisasi dan logo.
2. Seed/buat role dan permission.
3. Buat pengguna dan PIC.
4. Atur hari kerja dan hari libur.
5. Buat area, kategori, dan jenis item.
6. Buat Checklist Master per jenis item.
7. Buat inventaris dan assign PIC.
8. Pastikan `APP_URL`, lalu generate QR.
9. Jalankan checklist.
10. Pantau Dashboard, Monitoring Progress, Evidence Center, dan laporan.

## Backup dan Restore

Backup database:

```bash
mysqldump -u root -p assetra > assetra-backup.sql
```

Backup storage Linux/macOS:

```bash
tar -czf assetra-storage.tar.gz apps/api/storage
```

Backup storage PowerShell:

```powershell
Compress-Archive -Path .\apps\api\storage -DestinationPath .\assetra-storage.zip
```

Restore database:

```bash
mysql -u root -p assetra < assetra-backup.sql
```

Database dan storage harus berasal dari backup yang konsisten.

## Update Production

```bash
git pull origin master
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:migrate-deploy
pnpm build
# restart process Assetra
pnpm start:prod
```

Backup database dan storage sebelum update.

## Manual Runtime Validation

Setelah build:

```bash
pnpm build
pnpm start:prod
```

Pastikan hanya satu process NestJS production berjalan, kemudian cek:

```text
/                         → React tampil
/login                    → React Router bekerja
/dashboard                → refresh tidak 404
/inventory                → refresh tidak 404
/inventory/:id            → refresh tidak 404
/q/:publicId              → public page bekerja
/print-center             → React Router bekerja
/api/v1/auth/me           → NestJS API, bukan index.html
/api/v1/inventory         → NestJS API
```

Validasi authentication:

1. Buka `/login`.
2. Login.
3. Pastikan request CSRF berhasil.
4. Pastikan session cookie tersimpan.
5. Pastikan `/api/v1/auth/me` berhasil.
6. Buka Dashboard.
7. Lakukan satu CRUD request sesuai permission.
8. Logout.
9. Pastikan browser Network tidak menghubungi port Vite `5173`.

## Troubleshooting

### `React production build not found`

Jalankan:

```bash
pnpm build
pnpm start:prod
```

Pastikan file berikut ada:

```text
apps/web/dist/index.html
```

### Refresh route menghasilkan 404

- Pastikan `NODE_ENV=production`.
- Pastikan aplikasi dijalankan dengan `pnpm start:prod`.
- Pastikan reverse proxy meneruskan seluruh path ke NestJS.

### API mengembalikan React HTML

Path API harus diawali `/api/v1`. SPA fallback secara eksplisit mengecualikan `/api` dan `/api/*`.

### Login gagal pada production

- Pastikan `APP_URL` benar.
- Kosongkan `CORS_ORIGIN` untuk same-origin.
- Gunakan HTTPS saat `NODE_ENV=production` karena cookie secure.
- Periksa cookie `assetra_session` dan `assetra_csrf`.

### Prisma EPERM di Windows

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
pnpm db:generate
```

### Migration gagal

- Backup database.
- Jangan gunakan `migrate reset` pada data production.
- Gunakan `pnpm db:migrate-deploy` di production.

### File/evidence tidak tampil

- Periksa `apps/api/storage`.
- Periksa permission filesystem.
- Jalankan aplikasi dari root melalui `pnpm start:prod` agar working directory konsisten.
- Jangan expose storage melalui web server secara bebas.

## Scope Single-Server

Perubahan single-server tidak mengubah:

- Prisma business schema.
- Compliance Engine dan period logic.
- Inventory, Checklist, QR, atau Report business logic.
- Authentication, CSRF, session, dan RBAC.
- Notification Email/WhatsApp provider.
- UI.

Tidak ada Docker, microservice, frontend production server kedua, atau test suite baru pada perubahan ini.

## Lisensi

Assetra adalah aplikasi privat/komersial. Distribusi dan deployment mengikuti kebijakan pemilik repository dan organisasi terkait.
