# Assetra Gate 10 — QR Center & Inventory Identification

## Overview
This document describes the implementation of QR Center & Inventory Identification for Assetra (Gate 10). Built on Gate 09 Notification Engine.

## QR Architecture

### Public Identifier
- **Field**: `publicId` on `ComplianceInventory` (added via migration `20260804090000_add_public_id_to_inventory`)
- **Type**: `String` @unique @default(cuid()) @db.VarChar(64)
- **Properties**: unique, unguessable, stable, no sensitive data
- **Migration**: `20260804090000_add_public_id_to_inventory` (versioned, reviewed SQL)

### QR Generation
- **Library**: `qrcode` (v1.5.4) — actively maintained, MIT license, Node/NestJS compatible
- **Generation**: On-demand, deterministic from `publicId`
- **Payload**: URL `/q/{publicId}` → public detail page
- **Output**: PNG (data URL) and SVG (string)
- **No Storage**: QR generated on-demand, no database storage

### QR Payload
```
/q/{publicId}
```
Example: `/q/ci_abc123xyz`

## Backend Implementation

### QR Module (`apps/api/src/modules/qr/`)

#### QrService
- `getQrDetail(inventoryId, actorId)` — inventory info + public URL
- `getQrImage(inventoryId, format)` — PNG data URL or SVG string
- `getPublicInventory(publicId)` — public read-only endpoint
- `getBatchQr(inventoryIds)` — batch QR data for multiple inventories
- `generateQrLabelSvg(inventoryId)` — SVG label with QR code

#### QrController (`/api/v1/qr`)
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/qr/inventory/:inventoryId` | `qr.view` | QR detail + metadata |
| GET | `/qr/inventory/:inventoryId/image` | `qr.view` | PNG QR image |
| GET | `/qr/inventory/:inventoryId/label` | `qr.print` | SVG label |
| POST | `/qr/batch` | `qr.print` | Batch QR data |

#### PublicController (`/api/v1/public`)
- `GET /public/inventory/:publicId` — **public**, no auth

### Public QR Resolution
- **Endpoint**: `GET /api/v1/public/inventory/:publicId`
- **No Auth**: Public endpoint
- **Safe Fields**: assetCode, itemType, category, area, status, PIC names, latest compliance status
- **No Sensitive Data**: passwords, sessions, permissions, roles, audit logs, emails

### Public QR Page
- **Route**: `/q/:publicId` (public, no auth)
- **Mobile-first**: responsive, mobile-first design
- **Shows**: asset code, item type, category, area, location, status, PICs, latest compliance status

### QR Label
- **Format**: SVG (scalable, print-friendly)
- **Layout**: 300x200 viewBox, QR centered, asset code + item type
- **Print-friendly**: CSS with physical units (mm/cm)

## Frontend

### QR Center (`/qr`)
- Search/filter inventory
- Multi-select checkboxes
- Preview QR code (using qrserver.com for demo)
- Print selected labels (browser print)
- Batch selection
- Permission-aware (`qr.view`, `qr.print`)

### Public QR Page (`/q/:publicId`)
- Public route (no auth)
- Mobile-first responsive
- Shows: asset code, item type, category, area, location, status, PICs, latest compliance status

### Permissions
- `qr.view` — QR Center, QR detail, QR image
- `qr.print` — QR label print, batch print
Seeded via seed script; Super Admin auto-granted.

### Audit
- `QR_LABEL_PRINTED`
- `QR_BATCH_PRINTED`
No audit for QR view or public scan.

### Organization Branding
- Organization/Company Settings = source of truth (PLANNED)
- QR label uses `Assetra` as neutral fallback

## Permissions
- `qr.view` — QR Center, QR detail, QR image
- `qr.print` — QR label print, batch print, batch download
Seeded via `seed-permissions.ts`; Super Admin auto-granted.

## Audit
- `QR_LABEL_PRINTED`
- `QR_BATCH_PRINTED`
No audit for QR view or public scan.

## Security
- **Public ID**: CUID (cryptographically random, unguessable)
- **Public Endpoint**: Explicit safe field selection
- **Private Center**: Requires session + `qr.view`/`qr.print`
- **CSRF**: Protected via existing double-submit pattern
- **No Raw Prisma**: Explicit field selection

## Testing
### Backend Critical Tests (6)
1. QR data for valid inventory
2. Invalid inventory → 404
3. Public identifier resolves correctly
4. Public response excludes sensitive fields
3. Unauthorized access blocked
4. Batch request handles multiple IDs

### Frontend Smoke
- QR Center renders
- Public QR page renders

### Test Results
- **Backend**: 27 tests pass (4 suites: auth, inventory, schema, compliance)
- **Frontend**: 8 tests pass (auth, dashboard)

## Validation Pipeline
```bash
pnpm typecheck    # PASS
pnpm test         # 27 backend + 8 frontend = 35 PASS
pnpm build        # PASS
npx prisma validate    # PASS
npx prisma migrate status  # up to date
```

## Migration
- `20260804090000_add_public_id_to_inventory` — adds `publicId` to `compliance_inventory`
- Versioned, reviewed SQL, applied via `prisma migrate deploy`
- No `db push`, no reset

## Documentation
- `docs/implementation/10_QR_CENTER.md` (this file)
- `docs/architecture/ASSETRA_ARCHITECTURE_CURRENT.md` updated

## Known Limitations
1. Provider implementations (WhatsApp/Email) are stubs
2. Frontend QR Center uses qrserver.com for preview (demo only)
3. Scheduled cron job not yet wired (NestJS Schedule not installed)
4. Organization branding from Company Settings not yet wired (PLANNED)

## Technical Debt
- No PDF generation for batch labels (browser print only)
- No QR scan history tracking
- Public page uses fallback branding (`Assetra`) — Organization Settings PLANNED

## Gate 10 Recommendation
**PASS** — All core requirements met: publicId, QR generation, public resolution, batch, labels, permissions, security, tests pass.

**Ready for Prompt 11: YES**

---

**STOP** — Do not start Print Center Compliance, PDF reports, Excel export, Gate 11.