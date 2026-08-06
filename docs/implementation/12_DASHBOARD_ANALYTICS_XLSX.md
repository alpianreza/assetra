# Assetra Gate 12 — Dashboard, Analytics, XLSX

> **Status:** IMPLEMENTED — reconciled against actual code on 2026-08-05.
> This document describes what ACTUALLY exists.

## Overview
Gate 12 covers Dashboard, KPI/summary, Analytics, Filters, and XLSX (Excel) export.

All features now implemented:
- Dashboard summary (Inventory status counts)
- Analytics (Compliance status, Breakdowns per Area/Category)
- Filters (Area, Category)
- XLSX Export (Inventory, Compliance)

## Dashboard & KPI Summary

### Backend
- **Module**: `apps/api/src/modules/dashboard/` (`dashboard.module.ts`, `dashboard.service.ts`, `dashboard.controller.ts`)
- **Routes**:
  - `GET /api/v1/dashboard/summary?areaId=&categoryId=` — returns summary, compliance status, breakdowns
- **Permission**: `dashboard.view`
- **Behavior**:
  - Returns inventory KPI counts (Total, Active, Inactive, Maintenance, Disposed)
  - Compliance status (Completed, Pending, Late)
  - Breakdown per Area and per Category
  - Filters applied via query parameters (areaId, categoryId)
- **Response shape**: `{ success: true, data: { summary: {...}, compliance: {...}, breakdowns: {...} } }`

### Frontend
- **Page**: `apps/web/src/pages/DashboardPage.tsx`
- Uses `useDashboardSummary` hook and `useAreas`/`useCategories` hooks
- Responsive layout (desktop/mobile)
- Filter UI for Area and Category
- Export XLSX button
- Displays KPI cards, compliance status cards, and breakdown tables

## Analytics

### Backend (`DashboardService`)
- **Filters**: periode/date, Area, Category (via query params)
- **Breakdown per Area**: Inventory count grouped by Area
- **Breakdown per Category**: Inventory count grouped by Category
- **Compliance status**: Uses `ChecklistLog` status from existing Compliance Engine

### Compliance Engine Integration
- Dashboard does NOT duplicate compliance logic
- Uses `CompliancePeriodEngine` indirectly via `ComplianceService` / `ComplianceReportService`
- `getComplianceStatus()` aggregates raw `ChecklistLog.status` counts

## XLSX Export

### Inventory XLSX
- `xlsx` package is used in `apps/api/src/modules/exports/export.service.ts`
- **Route**: `GET /api/v1/inventory/export.xlsx`
- **Permission**: `inventory.view`

### Compliance XLSX
- Uses existing `ComplianceReportService.getReportData()` (canonical engine)
- **Route**: `POST /api/v1/reports/compliance/export.xlsx`
- **Permission**: `reports.export`
- **Payload**: `{ inventoryIds, templateId, periodKey, sessionId }`

### Frontend Integration
- **Print Center**: `apps/web/src/features/reports/pages/PrintCenterPage.tsx`
  - Template ID and Period inputs
  - XLSX batch export button
  - Uses `exportComplianceXlsx` API helper

## Permissions
- `dashboard.view` — access to dashboard summary endpoint
- `inventory.view` — export inventory XLSX
- `reports.export` — export compliance XLSX

All seeded in `seed-permissions.ts`.

## Backend / Frontend Files
### Backend
- `src/modules/dashboard/dashboard.module.ts`
- `src/modules/dashboard/dashboard.service.ts`
- `src/modules/dashboard/dashboard.controller.ts`
- `src/modules/exports/export.module.ts`
- `src/modules/exports/export.service.ts`
- `src/modules/exports/export.controller.ts`

### Frontend
- `pages/DashboardPage.tsx` — dashboard page with filters/analytics
- `features/dashboard/api.ts` — API client
- `features/dashboard/hooks.ts` — React hooks
- `features/reports/pages/PrintCenterPage.tsx` — compliance XLSX export

## Validation
- `pnpm typecheck` — ✅
- `pnpm test` — ✅ all passing
- `pnpm build` — ✅
- `npx prisma validate` — ✅
- `npx prisma migrate status` — ✅

## Gate 12 Verdict
**PASS** — Dashboard, Analytics, Filters, and XLSX export are fully implemented.

---
**STOP** — Do not start Gate 15.
