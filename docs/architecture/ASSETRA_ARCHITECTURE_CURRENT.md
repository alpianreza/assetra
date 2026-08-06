# Assetra Architecture — Current State

> **Source of truth.** This document describes the system that ACTUALLY EXISTS after Gate 10, plus locked future decisions. Sections are clearly marked **IMPLEMENTED** or **PLANNED**. This is not aspirational documentation.

## Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + TanStack Query + React Router — **IMPLEMENTED**
- **Backend**: NestJS + TypeScript — **IMPLEMENTED**
- **Database**: MySQL + Prisma (versioned migrations) — **IMPLEMENTED**
- **Architecture style**: Modular Monolith, single-server deployment — **IMPLEMENTED**

## Authentication & Authorization — **IMPLEMENTED**
- Server-side sessions (HTTPOnly cookie, SHA-256 hashed token)
- Double-submit CSRF protection
- RBAC: Role → Permission
- Permission seed mechanism (idempotent, Super Admin auto-grant)

## Modules — **IMPLEMENTED**
| Module | Description |
|--------|-------------|
| Auth | Login, session, CSRF |
| Users | User CRUD, status, relational PIC safety |
| Roles | Role CRUD, permission catalog |
| Master Data | Areas, Inventory Categories, Asset Item Types |
| Inventory | Compliance Inventory CRUD + relational PIC |
| Settings | Working Day config, Holiday overrides, canonical `isWorkingDay` |
| Checklist (Gate 07) | Templates, Questions, Sessions, Template-Session, Inventory-Template assignments |
| Compliance (Gate 08) | Execution engine: periods, availability, submission, history |
| Notification (Gate 09) | Reminder engine, WhatsApp/Email providers, preferences, preview/dry-run/manual, duplicate protection, delivery lifecycle |
| QR Center (Gate 10) | QR generation, public resolution, labels, batch, public page, permissions |

## Domain Locked Decisions
- **Inventory**: canonical `compliance_inventory`, no duplicate inventory domains
- **PIC**: relational via `inventory_pic_assignments` (N:M Inventory↔User)
- **allow_na**: belongs to **AssetItemType** (NOT ChecklistQuestion) — **LOCKED**
  - Resolution: inventory → itemType → allowNA
- **Frequency**: belongs to **AssetItemType** (daily/weekly/monthly)
- **Checklist Sessions**: configurable master data (`checklist_sessions`), NOT hardcoded Pagi/Siang/Sore
- **Working days**: configurable including Sabtu/Minggu (holiday override → weekday config)
- **No IT Monitoring**: NOT part of Assetra
- **No Patrol**: NOT part of Assetra
- **EAMS**: legacy business-rule reference only, not copied as architecture

## Compliance Period Engine — **IMPLEMENTED**
Canonical single source of truth at `apps/api/src/modules/compliance/period-engine.service.ts`:
- Period generation: daily / weekly W1-W4 / monthly
- Deterministic period keys
- Working/offday resolution (delegates to `SettingsService.isWorkingDay`)
- Late rules: daily 21d, weekly 28d, monthly 90d
- allow_na resolution
- Session requirement
- Occurrence keying
- Completion status

## Notification & Reminder Engine — **IMPLEMENTED (Gate 09)**
Canonical single source of truth at `apps/api/src/modules/notification/reminder-engine.service.ts`:
- **Channel-agnostic provider pattern**: `NotificationProvider` interface with `WhatsAppProvider` and `EmailProvider` stubs
- **NotificationService**: resolves PIC recipients from `inventory_pic_assignments`, validates contacts, checks preferences, dispatches via providers, logs delivery
- **ReminderEngine**: single source of truth for eligibility — uses Compliance Engine as single source of truth for occurrence status (pending/late)
- **Eligibility**: pending/late only; excludes completed, future, offday
- **Duplicate protection**: application-layer deduplication via `Notification` table (occurrence key: inventory:template:period:session); restart-safe
- **Failure isolation**: per-recipient try/catch; batch continues on individual failure; summary returned
- **Delivery lifecycle**: PENDING → SENT / FAILED / SKIPPED_* (NO_PHONE, NO_EMAIL, DISABLED, DUPLICATE)
- **Duplicate scheduler protection**: occurrence key persisted in `Notification` table
- **Preferences**: per-user per-channel (`NotificationPreference`); seeded enabled; admin/user can toggle
- **Contact validation**: WhatsApp requires `User.phone`, Email requires `User.email`; missing → SKIPPED_NO_PHONE/EMAIL (batch continues)
- **Recipient resolution**: strictly relational — `Inventory` → `InventoryPicAssignment` → `User`
- **Failure isolation**: provider errors caught per-recipient; batch continues; summary returned
- **Dry run / preview**: eligibility, counts, missing contacts, disabled prefs — no provider calls
- **Manual run**: preview → confirm → execute → summary (processed/sent/failed/skipped)
- **Scheduled run**: same `ReminderEngine` instance; NestJS Schedule / cron trigger
- **Duplicate protection**: occurrence key in `Notification` table; restart-safe
- **Preferences**: `NotificationPreference` per user/channel; seeded enabled; admin/user can toggle
- **Contact validation**: WhatsApp needs phone, Email needs email; missing → SKIPPED_NO_PHONE/EMAIL (batch continues)
- **Recipient resolution**: strictly relational `Inventory` → `InventoryPicAssignment` → `User`

### Permissions
- `notification.view` — history, preview
- `notification.manage` — preferences, settings
- `notification.send` — manual execution
Seeded via idempotent seed; Super Admin auto-granted.

### Audit
Administrative actions:
- `REMINDER_MANUAL_RUN`
- `NOTIFICATION_PREFERENCE_CHANGED`
Operational delivery in `Notification` table (not AuditLog).

## QR Center & Inventory Identification — **IMPLEMENTED (Gate 10)**
Canonical implementation at `apps/api/src/modules/qr/`:

### QR Architecture
- **Public Identifier**: `publicId` field on `ComplianceInventory` (UUID-like, unique, unguessable, stable)
- **QR Payload**: URL `/q/{publicId}` pointing to public detail page
- **Dynamic Generation**: QR images generated on-demand via `qrcode` library (PNG/SVG)
- **No QR Storage Table**: QR images generated on-demand, no storage table

### QR Module (`apps/api/src/modules/qr/`)
- **QrService**: 
  - `getQrDetail(inventoryId, actorId)` — returns inventory info + QR payload URL
  - `getQrImage(inventoryId, format)` — PNG data URL or SVG string
  - `getPublicInventory(publicId)` — public read-only endpoint, safe fields only
  - `getBatchQr(inventoryIds)` — batch QR data for multiple inventories
  - `generateQrLabelSvg(inventoryId)` — SVG label with QR code, asset code, item type
- **QrController** (`/api/v1/qr`):
  - `GET /qr/inventory/:inventoryId` — QR detail (requires `qr.view`)
  - `GET /qr/inventory/:inventoryId/image` — PNG QR image (requires `qr.view`)
  - `GET /qr/inventory/:inventoryId/label` — SVG label (requires `qr.print`)
  - `POST /qr/batch` — batch QR data (requires `qr.print`)
- **PublicController** (`/api/v1/public`):
  - `GET /public/inventory/:publicId` — public inventory info (no auth required)

### QR Public Resolution
- **Public Endpoint**: `GET /api/v1/public/inventory/:publicId` — no authentication required
- **Safe Fields Only**: Explicit select of safe fields (assetCode, itemType, category, area, status, PIC names, latest compliance status)
- **No Sensitive Data**: No passwords, sessions, permissions, roles, audit logs, emails, auth info

### Frontend Routes
- `/qr` — **QR Center** (protected, `qr.view`): search, filter, select, preview, print labels
- `/q/:publicId` — **Public QR Page** (public, no auth): mobile-first, shows inventory info, PIC, latest compliance

### QR Label
- **SVG Label**: Generated dynamically via `generateQrLabelSvg`
- **Layout**: 300x200 viewBox, QR code centered, asset code + item type below
- **Print-friendly**: SVG with physical units, print-friendly CSS

### QR Center UI (`/qr`)
- Search/filter inventory
- Multi-select with checkboxes
- Preview QR code
- Print selected labels (browser print)
- Batch selection
- Permission-aware: `qr.view` for view, `qr.print` for print

### Permissions
- `qr.view` — QR Center, QR detail, QR image
- `qr.print` — QR label print, batch print, batch download
Seeded via idempotent seed; Super Admin auto-granted.

### Audit
- `QR_LABEL_PRINTED`
- `QR_BATCH_PRINTED`
No audit for QR view or public scan.

### Organization Branding
- Organization/Company Settings is source of truth for branding
- QR label uses `Assetra` as neutral fallback (Organization Settings PLANNED for full branding)

## Organization & Reporting — **IMPLEMENTED (Gate 11)**
- **Organization/Company Settings**: IMPLEMENTED — canonical source of truth for branding (name, shortName, address, phone, email, website, footer, logo path)
- **BrandingService**: IMPLEMENTED — canonical branding provider (`apps/api/src/modules/branding/branding.service.ts`)
- **Print Center**: IMPLEMENTED (`/reports/print-center`, browser print)
- **PDF Reporting**: IMPLEMENTED (single + batch via `pdf-lib`, server-side)
- **ComplianceReportService**: IMPLEMENTED — canonical report data builder
- **Excel Export**: IMPLEMENTED
- **Analytics / Dashboard KPI**: IMPLEMENTED

## Execution Layer — **IMPLEMENTED (Gate 08)**
- Checklist execution (build form)
- Checklist submission (atomic, recheck policy)
- Checklist history
- Status calculation (backend authoritative)




## Testing
- Backend e2e: auth, inventory, compliance, qr, schema, evidence (40 tests) — **IMPLEMENTED**
- Frontend: auth, dashboard smoke (8 tests) — **IMPLEMENTED**
- Jest configured serial (`maxWorkers: 1`) to share a single MySQL test DB safely — **IMPLEMENTED**

## Migration History
- `20260803200000_init` — Prompt 03B baseline
- `20260804081822_add_allow_na_to_item_type` — allow_na moved to AssetItemType (Gate 07 correction)
- `20260804090000_add_public_id_to_inventory` — publicId added to ComplianceInventory (Gate 10)