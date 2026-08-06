# Assetra Gate 13 — Reconciliation Gap Analysis

> **Reconciled against actual code on 2026-08-05 (updated after Gate 12B completion).**
> Goal: `ARCHITECTURE = IMPLEMENTATION = DOCUMENTATION`.
> This document lists what is genuinely implemented vs. what is a stub/placeholder/debt.

## Gate 12B Resolution (2026-08-05)
The following items previously marked as gaps are now **RESOLVED**:
- **Dashboard Analytics**: `DashboardService` now computes summary KPI, compliance status, breakdown per area/category, and supports filters (area, category).
- **Dashboard Filters**: `GET /api/v1/dashboard/summary?areaId=&categoryId=` — backend + frontend UI.
- **Frontend Dashboard**: `DashboardPage.tsx` now renders the real dashboard (KPI cards, compliance status, breakdown tables, filters, export button) — replaced the health-check placeholder.
- **Inventory XLSX**: `GET /api/v1/inventory/export.xlsx` (uses `xlsx` package).
- **Compliance XLSX**: `POST /api/v1/reports/compliance/export.xlsx` (uses canonical `ComplianceReportService`).
- **Evidence E2E tests**: `test/evidence.e2e.spec.ts` — 6 real tests passing (upload, invalid file rejected, relation integrity, unauthorized rejected, retrieval, delete cleans DB + file).
- **Evidence delete file cleanup**: `EvidenceService.deleteEvidence` now removes the file from disk.
- **Stale architecture entry**: `ASSETRA_ARCHITECTURE_CURRENT.md` now marks Excel Export, Analytics/Dashboard KPI as **IMPLEMENTED**.

### Still genuine technical debt (deferred to later gates)
- WhatsApp provider — logs only (stub)
- Email provider — logs only (stub)
- Advanced analytics (time-series, drill-down, complex charts) — not required by Gate 12B

## 1. Architecture

- **Style**: Modular Monolith (NestJS backend + React/Vite frontend, MySQL + Prisma).
  Consistent with `docs/architecture/ASSETRA_ARCHITECTURE_CURRENT.md`.
- **Canonical engines** that exist and are wired:
  - `CompliancePeriodEngine` — `apps/api/src/modules/compliance/period-engine.service.ts`
  - `BrandingService` — `apps/api/src/modules/branding/branding.service.ts`
  - `ComplianceReportService` — `apps/api/src/modules/reports/compliance-report.service.ts`
  - `ReminderEngine` — `apps/api/src/modules/notification/reminder-engine.service.ts`
- **Stale architecture note**: `ASSETRA_ARCHITECTURE_CURRENT.md` still listed
  "Evidence/photo upload … no upload flow" under *Not Yet Implemented*. **Gate 14B confirmed
  Evidence IS implemented** (see §Modules). This entry is now corrected.

## 2. Database

- **MySQL** `assetra_dev`, Prisma 5.22, 5 migrations applied (verified via `prisma migrate status`).
- Migrations:
  1. `20260803200000_init`
  2. `20260804081822_add_allow_na_to_item_type`
  3. `20260804090000_add_public_id_to_inventory`
  4. `20260804100000_add_organization_branding`
  5. `20260805055543_fix_evidence_relations_final`
- **DB = Prisma: YES** (verified `evidence`, `checklist_logs`, `compliance_inventory` columns + FKs in INFORMATION_SCHEMA).
- `evidence.checklistLogId` → `checklist_logs(id)` FK exists and is NOT NULL (1:N `ChecklistLog` → `Evidence`).
- No drift between schema.prisma and live database.

## 3. Backend

### Implemented modules (with real logic)
| Module | Path | Notes |
|---|---|---|
| Auth | `src/modules/auth/` | sessions, CSRF, RBAC, guards |
| Users | `src/modules/users/` | CRUD + status |
| Roles | `src/modules/roles/` | CRUD + permission catalog |
| Master Data | `src/modules/master-data/` | areas, categories, item types |
| Inventory | `src/modules/inventory/` | CRUD + relational PIC + delete safety |
| Settings | `src/modules/settings/` | working day config, holidays |
| Checklist | `src/modules/checklist/` | templates, questions, sessions |
| Compliance | `src/modules/compliance/` | period engine, execution, history |
| Notification | `src/modules/notification/` | reminder engine, dedup, preferences |
| QR Center | `src/modules/qr/` | QR gen, public page, labels |
| Branding | `src/modules/branding/` | organization branding canonical |
| Reports | `src/modules/reports/` | report data + PDF (single/batch) |
| Dashboard | `src/modules/dashboard/` | KPI summary + analytics + filters (area/category) |
| Evidence | `src/modules/evidence/` | upload/retrieve/delete + audit + file cleanup |
| Exports | `src/modules/exports/` | Inventory XLSX + Compliance XLSX |
| Health | `src/modules/health/` | health check |

### Stubs / placeholders that genuinely still exist
| Location | What it is | Reality |
|---|---|---|
| `src/modules/notification/providers/whatsapp.provider.ts` | WhatsApp provider | **STUB** — logs only, `// Implement Fonnte API or similar here` |
| `src/modules/notification/providers/email.provider.ts` | Email provider | **STUB** — logs only, `// Implement SMTP transporter here` |

## 4. Frontend

- **Stack**: React + TS + Vite + Tailwind + TanStack Query + React Router — implemented.
- **Real pages**: auth, users, roles, master-data (areas/categories/item-types), inventory,
  checklist templates/sessions, compliance execution, QR center, organization settings, print center,
  **dashboard (KPI + analytics + filters)**.
- **XLSX export UI**: dashboard has Inventory XLSX button; Print Center has Compliance XLSX button.
- **Not present**: evidence upload UI (per `14_EVIDENCE_PRODUCTION_HARDENING.md` backend-complete note).

## 5. Documentation (docs/implementation/)

| Gate doc | Present | Correct vs code |
|---|---|---|
| 04 AUTH_RBAC | ✅ | ✅ |
| 05 MASTER_DATA_USERS | ✅ | ✅ |
| 06 INVENTORY_PIC | ✅ | ✅ |
| 07 CHECKLIST_MASTER | ✅ | ✅ |
| 08 COMPLIANCE_EXECUTION | ✅ | ✅ |
| 09 NOTIFICATION_REMINDER | ✅ | ✅ (providers are stubs — noted) |
| 10 QR_CENTER | ✅ | ✅ |
| 11 ORGANIZATION_PRINT_REPORTING / 11_PRINT_PDF_REPORTING | ✅ | ✅ (PDF implemented) |
| 12 DASHBOARD_ANALYTICS_XLSX | ✅ (created this session) | ✅ (XLSX/analytics now IMPLEMENTED) |
| 13 RECONCILIATION_GAP_ANALYSIS | ✅ (this file) | ✅ |
| 14 EVIDENCE_PRODUCTION_HARDENING | ✅ | ✅ (Evidence implemented) |

## 6. List of Modules Implemented (authoritative)
See §3 Backend table — all 15 modules above are wired into `AppModule` and compile.

## 7. Stub / Placeholder Summary (authoritative)
1. WhatsApp provider — stub (logs only)
2. Email provider — stub (logs only)

## 8. Technical Debt / Actual Gaps
1. **Notification providers are non-functional** (no real WhatsApp/Email delivery) — P0 for production.
2. **Duplicate stale tree** `apps/api/apps/api/` (empty dirs, 0 TS files) — cleanup candidate.
3. **Advanced analytics** (time-series, drill-down, complex charts) — not required by Gate 12B; deferred.
4. `ASSETRA_ARCHITECTURE_CURRENT.md` previously marked Evidence/Excel/Analytics as "not implemented" — now corrected.

## 9. Validation Results
- `npx prisma validate` — ✅ schema valid
- `npx prisma migrate status` — ✅ 5 migrations, DB up to date
- `pnpm typecheck` — ✅ passes
- `pnpm build` — ✅ passes
- `pnpm test` — ✅ 48 tests pass (39 backend: auth, inventory, compliance, qr, schema, evidence; 9 frontend: auth, dashboard)

## 10. Gate 13 Verdict
**DOCUMENTATION SYNCED** — Architecture/implementation/documentation now aligned for Gates 12–13.
Remaining gaps (providers, advanced analytics) are logged as technical debt, not silently claimed done.

---
**STOP** — Do not start Gate 15. No new feature implementation in this session.
