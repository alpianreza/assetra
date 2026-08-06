# Assetra Gate 14 — Evidence / Photo & Production Hardening

## Overview
This document describes the implementation of Gate 14: evidence/photo upload for checklist compliance plus production hardening.

## Evidence Module (`apps/api/src/modules/evidence/`)
- **EvidenceService**: CRUD for evidence records using existing `Evidence` model.
  - `createEvidence` — validates checklist log belongs to inventory, records evidence
  - `getEvidence` — fetch with checklist log + inventory context
  - `deleteEvidence` — hard delete with audit log
- **EvidenceController** (`/api/v1/evidence`):
  - `POST /evidence/upload` — Multipart upload (permission `compliance.execute`)
  - `GET /evidence/:id` — evidence metadata (permission `compliance.execute`)
  - `GET /evidence/file/:id` — serve file
  - `DELETE /evidence/:id` — delete (permission `compliance.execute`)

### Upload Security
- **File type validation**: JPEG, PNG, WebP only (via multer fileFilter)
- **Size limit**: 5MB
- **Random filename**: 16-byte crypto-random hex + original extension (server-generated, no user-controlled path)
- **Storage**: local `storage/evidence/` (not database binary)
- **Database**: stores only `storageKey` reference path

### Compilation validation
- No schema migration required — existing `Evidence` model sufficient
- `@types/multer` added for typing

## Compliance Integration
- Evidence links to a specific `ChecklistLog` (occurrence answer) and `ComplianceInventory`
- Uses existing canonical compliance domain — no new engine, no duplicate logic
- PIC: relational via `inventory_pic_assignments`
- allowNA: from `AssetItemType`

## Reporting Integration
- `ComplianceReportService` already includes `evidence` in its `answers` (loaded via `checklistLog.evidence`)
- Print preview, Single PDF, Batch PDF all read evidence through the same canonical report data source

## Production Hardening
- Upload authorization: `compliance.execute` permission
- Audit events: `EVIDENCE_ADDED`, `EVIDENCE_DELETED`
- CSRF: protected by existing double-submit pattern (all mutations)
- No sensitive path exposure; served via controlled endpoint

## Permissions
- `compliance.execute` (existing) — upload, view, delete evidence
No new permissions needed.

## Tests
- Backend suite: 33 tests pass (auth, inventory, schema, compliance, QR)
- Frontend: 8 tests pass
- Full pipeline validation green

## Validation
- `pnpm typecheck` — PASS
- `pnpm test` — PASS (33 backend + 8 frontend)
- `pnpm build` — PASS
- `npx prisma validate` — PASS
- `npx prisma migrate status` — up to date (4 migrations)

## Architecture Sync
- `docs/architecture/ASSETRA_ARCHITECTURE_CURRENT.md` updated:
  - Evidence / Photo → **IMPLEMENTED**

## Remaining Gap
- Frontend evidence preview/upload UI in checklist execution page (backend complete; UI wiring pending)
- Orphan file cleanup on DB delete (hard delete removes DB row; file removal not yet hooked)

## Gate 14 Recommendation
**PASS** — Evidence upload, validation, and reporting integration implemented server-side; production hardening applied.

## Ready for Gate 15
**YES**

---
**STOP** — Do not start Gate 15.