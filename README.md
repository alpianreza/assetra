# Assetra

Assetra adalah aplikasi manajemen inventaris dan compliance checklist berbasis QR dengan frontend React, backend NestJS, Prisma, MySQL, session cookie, CSRF, dan RBAC.

## Arsitektur

### Development

```text
Browser → Vite :5173 → /api proxy → NestJS :3000
```

Development tetap memakai dua dev server agar HMR berfungsi.

### Production — Single Server

```text
Browser
   │
   ▼
NestJS :PORT
   ├── /api/v1/*   → REST API
   ├── file routes → controller/authorization existing
   └── /*           → React production build + SPA fallback
```

`pnpm build` menghasilkan:

```text
apps/web/dist/
apps/api/dist/
```

`pnpm start:prod` hanya menjalankan satu process NestJS. Vite tidak dijalankan di production.

## Fitur Utama

- Login dengan session cookie dan CSRF.
- Home, Dashboard, dan Monitoring Progress PIC.
- Master Data, Inventaris, Checklist Master, periode, hari kerja/libur.
- QR Center dan public QR page.
- Evidence Center dan hasil checklist read-only.
- Role, permission, pengguna, dan foto pengguna.
- Notifikasi in-app untuk checklist pending/terlambat.
- Print Center, export, organisasi, tema, dan bilingual.

## Persyaratan

- Node.js minimal `20.10.0`.
- pnpm `9.x`.
- MySQL 8.x atau MariaDB kompatibel Prisma MySQL.
- Git dan akses tulis ke `apps/api/storage`.

```bash
corepack enable
corepack prepare pnpm@9.0.0 --activate
```

## Environment

Salin `.env.example` ke `.env` di root repository.

Windows:

```powershell
Copy-Item .env.example .env
```

Linux/macOS:

```bash
cp .env.example .env
```

### Development

```env
NODE_ENV=development
PORT=3000
API_PORT=3000
APP_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
SESSION_SECRET=ganti-dengan-random-string-panjang
DATABASE_URL=mysql://root:@localhost:3306/assetra_dev
```

### Production single-server dengan HTTPS

```env
NODE_ENV=production
PORT=3000
APP_URL=https://assetra.perusahaan.com
FRONTEND_URL=https://assetra.perusahaan.com
CORS_ORIGIN=
COOKIE_SECURE=true
SESSION_SECRET=ganti-dengan-random-string-panjang-dan-rahasia
DATABASE_URL=mysql://assetra_user:password-kuat@127.0.0.1:3306/assetra
```

### Production single-server pada HTTP LAN terpercaya

```env
NODE_ENV=production
PORT=3000
APP_URL=http://192.168.1.20:3000
FRONTEND_URL=http://192.168.1.20:3000
CORS_ORIGIN=
COOKIE_SECURE=false
SESSION_SECRET=ganti-dengan-random-string-panjang-dan-rahasia
DATABASE_URL=mysql://assetra_user:password-kuat@127.0.0.1:3306/assetra
```

`COOKIE_SECURE=false` hanya untuk LAN terpercaya tanpa TLS. Deployment internet/domain harus memakai HTTPS dan `COOKIE_SECURE=true`.

| Variabel | Keterangan |
| --- | --- |
| `NODE_ENV` | `development` atau `production`; static React hanya dilayani pada production. |
| `PORT` | Port single server NestJS; prioritas utama. |
| `API_PORT` | Alias kompatibilitas, dipakai jika `PORT` kosong. |
| `APP_URL` | URL publik Assetra dan base URL QR. |
| `FRONTEND_URL` | Alias kompatibilitas instalasi lama. |
| `CORS_ORIGIN` | Allowlist origin lintas domain; kosongkan untuk same-origin production. |
| `COOKIE_SECURE` | `true` untuk HTTPS; `false` hanya untuk HTTP LAN terpercaya. |
| `SESSION_SECRET` | Secret deployment; jangan dikomit. Auth existing tetap opaque database-backed session, bukan JWT localStorage. |
| `DATABASE_URL` | Connection string MySQL Prisma. |

Jangan menambahkan `/api/v1` ke `APP_URL`. Root `.env` dimuat secara portable; tidak ada hardcoded path Windows.

## Fresh Installation — Development

```bash
git clone https://github.com/alpianreza/assetra.git
cd assetra
git checkout master
pnpm install
```

Buat database:

```sql
CREATE DATABASE assetra_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Salin `.env.example`, sesuaikan `DATABASE_URL`, lalu:

```bash
pnpm db:migrate
pnpm db:generate
pnpm seed:permissions
pnpm seed:checklist
pnpm admin:create
pnpm dev
```

Akses:

- Frontend Vite: `http://localhost:5173`
- API NestJS: `http://localhost:3000/api/v1`

Menjalankan terpisah tetap didukung:

```bash
pnpm --filter @assetra/api dev
pnpm --filter @assetra/web dev
```

Frontend memakai API relatif `/api/v1`; Vite proxy meneruskannya ke NestJS saat development.

## Fresh Installation — Production Single Server

```bash
git clone https://github.com/alpianreza/assetra.git
cd assetra
git checkout master
pnpm install --frozen-lockfile
```

Siapkan MySQL dan `.env` production, kemudian:

```bash
pnpm db:generate
pnpm db:migrate-deploy
pnpm seed:permissions
pnpm seed:checklist
pnpm admin:create
pnpm build
pnpm start:prod
```

`admin:create` hanya diperlukan untuk administrator pertama.

Akses:

```text
http://SERVER_IP:PORT
```

atau domain HTTPS yang diatur dalam `APP_URL`.

Command final production:

```bash
pnpm build
pnpm start:prod
```

Tidak perlu menjalankan Vite, `vite preview`, frontend server kedua, atau terminal kedua.

## Cara NestJS Melayani React

Saat `NODE_ENV=production`:

1. NestJS me-resolve `apps/web/dist` secara portable terhadap struktur monorepo.
2. Adapter resmi NestJS Express melayani file hasil build Vite.
3. API tetap memiliki global prefix `/api/v1`.
4. Seluruh controller NestJS didaftarkan sebelum SPA fallback.
5. Route React Router tanpa ekstensi menerima `apps/web/dist/index.html`.
6. Start gagal dengan pesan jelas jika `apps/web/dist/index.html` belum dibuat.

Tidak ada path absolut seperti `C:\xampp\htdocs\assetra` di source code.

## API dan SPA Fallback

Contoh routing:

```text
GET /inventory          → React index.html
GET /dashboard          → React index.html
GET /q/:publicId        → React index.html
GET /print-center       → React index.html
GET /api/v1/inventory   → NestJS REST API
GET /api/v1/auth/me     → NestJS Auth API
```

Refresh/direct access didukung untuk `/`, `/login`, `/dashboard`, `/inventory`, `/inventory/:id`, `/compliance`, `/qr`, `/q/:publicId`, `/reports`, `/print-center`, `/master/areas`, `/master/categories`, `/master/item-types`, dan `/settings/organization`.

SPA fallback tidak menangkap:

- `/api` dan `/api/*`.
- `/storage` dan `/storage/*`.
- File berekstensi seperti `.js`, `.css`, `.svg`, dan `.png`.

## Authentication Same-Origin

Authentication tidak didesain ulang:

- Session cookie `assetra_session` tetap httpOnly.
- CSRF cookie dan `X-CSRF-Token` tetap digunakan.
- Login, `/api/v1/auth/me`, logout, session, dan RBAC tetap existing.
- Tidak ada JWT di localStorage.
- Tidak ada bypass CSRF atau hardcoded user/Super Admin.

Production frontend memanggil `/api/v1` pada origin yang sama dengan NestJS. `COOKIE_SECURE` memungkinkan HTTPS production tetap aman dan HTTP LAN terpercaya tetap dapat melakukan login tanpa mengganti arsitektur auth.

## Storage

Storage existing umumnya berada di:

```text
apps/api/storage/
├── checklist/
├── inventory/
├── qr/
├── users/
└── organization/ atau lokasi branding existing
```

Folder storage **tidak diekspos seluruhnya sebagai public static directory**. Browser mengakses file melalui controller existing sehingga authorization evidence, foto inventaris, foto pengguna, QR, dan logo tetap dipertahankan. SPA fallback mengecualikan `/storage/*`.

Pastikan process Node memiliki izin baca/tulis dan backup storage bersama database.

## Windows/XAMPP

Path contoh berikut hanya dokumentasi, bukan hardcoded source path:

```powershell
cd C:\xampp\htdocs\assetra
pnpm install
Copy-Item .env.example .env
pnpm db:generate
pnpm db:migrate-deploy
pnpm seed:permissions
pnpm seed:checklist
pnpm admin:create
pnpm build
pnpm start:prod
```

MySQL dapat dijalankan dari XAMPP. Jika `.env` menggunakan `PORT=3000`, buka `http://SERVER_IP:3000`. Apache XAMPP tidak diperlukan untuk menyajikan React.

Untuk Windows LAN HTTP, gunakan `COOKIE_SECURE=false`. Untuk domain/internet, gunakan HTTPS dan `COOKIE_SECURE=true`.

## Reverse Proxy Opsional

Nginx/Apache tidak diperlukan untuk menjalankan React. Gunakan hanya untuk domain, HTTPS, SSL termination, atau port 80/443.

```text
Internet/LAN → Nginx/Apache → NestJS → React + API
```

Nginx meneruskan seluruh request ke satu NestJS process:

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

Nginx bukan server/process React kedua.

## QR Center dan URL

QR menggunakan `{APP_URL}/q/{publicId}`. Jika IP, domain, protocol, atau port berubah:

1. Ubah `APP_URL`.
2. Restart NestJS.
3. Buka QR Center.
4. Regenerate QR.
5. Cetak ulang label lama.

`FRONTEND_URL` tetap didukung sebagai alias instalasi lama.

## Notifikasi

Notifikasi in-app aktif untuk PIC dan checklist pending/terlambat melalui ikon lonceng dan `/notifications`.

```text
Email/WhatsApp provider configuration:
Pending production provider integration.
```

Provider Email/WhatsApp tetap stub/log development. Task single-server tidak mengimplementasikan atau mengubah provider tersebut.

## Urutan Konfigurasi Assetra

1. Atur organisasi dan logo.
2. Seed/buat role dan permission.
3. Buat pengguna/PIC.
4. Atur hari kerja dan libur.
5. Buat area, kategori, dan jenis item.
6. Buat Checklist Master.
7. Buat inventaris dan assign PIC.
8. Pastikan `APP_URL`, lalu generate QR.
9. Jalankan checklist.
10. Pantau Dashboard, Progress, Evidence, dan laporan.

## Backup

```bash
mysqldump -u root -p assetra > assetra-backup.sql
tar -czf assetra-storage.tar.gz apps/api/storage
```

PowerShell:

```powershell
Compress-Archive -Path .\apps\api\storage -DestinationPath .\assetra-storage.zip
```

Database dan storage harus dibackup/restore sebagai satu pasangan konsisten.

## Update Production

```bash
git pull origin master
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:migrate-deploy
pnpm build
pnpm start:prod
```

Backup database dan storage sebelum update.

## Manual Runtime Validation

Jalankan:

```bash
pnpm build
pnpm start:prod
```

Pastikan hanya satu production process NestJS, kemudian periksa:

```text
/                       → React tampil
/login                  → React Router bekerja
/dashboard              → refresh tidak 404
/inventory              → refresh tidak 404
/q/:publicId            → public page bekerja
/print-center           → React Router bekerja
/api/v1/auth/me         → NestJS API
/api/v1/inventory       → NestJS API
```

Validasi login → CSRF → session → `/api/v1/auth/me` → Dashboard → CRUD sesuai permission → logout. Browser Network tidak boleh menghubungi Vite port `5173` pada production.

## Troubleshooting

### React build tidak ditemukan

```bash
pnpm build
pnpm start:prod
```

Pastikan `apps/web/dist/index.html` tersedia.

### Refresh route 404

- Pastikan `NODE_ENV=production`.
- Jalankan `pnpm start:prod`.
- Pastikan reverse proxy meneruskan seluruh path ke NestJS.

### Login gagal

- Pastikan `APP_URL` sama dengan URL browser.
- Kosongkan `CORS_ORIGIN` untuk same-origin.
- HTTPS: `COOKIE_SECURE=true`.
- HTTP LAN terpercaya: `COOKIE_SECURE=false`.
- Periksa cookie `assetra_session` dan `assetra_csrf`.

### Prisma EPERM Windows

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
pnpm db:generate
```

### Migration gagal

Jangan gunakan `migrate reset` pada production. Backup database dan gunakan `pnpm db:migrate-deploy`.

### Evidence/foto tidak tampil

Periksa `apps/api/storage`, permission filesystem, dan jalankan dari root dengan `pnpm start:prod`. Jangan expose storage secara bebas.

## Scope Perubahan

Single-server tidak mengubah Prisma business schema, Compliance Engine, period logic, Inventory, Checklist, Report, RBAC, atau provider Email/WhatsApp. QR hanya mendapat alias konfigurasi deployment `APP_URL`; business logic tetap sama. Tidak ada Docker, microservice, UI redesign, atau test baru.

## Lisensi

Assetra adalah aplikasi privat/komersial. Distribusi dan deployment mengikuti kebijakan pemilik repository dan organisasi terkait.
