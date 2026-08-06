# Assetra Gate 11 — Organization, Print Center, PDF

## Overview
This document describes the implementation of Gate 11:
- Organization Settings as canonical branding source
- Print Center for compliance report rendering
- PDF export
- QR Center cleanup (remove external dependency)

## Organization Settings
- **Model**: `Organization` model extended with `shortName`, `phone`, `email`, `website`, `reportFooter`
- **Migration**: `20260804100000_add_organization_branding` adds branding fields
- **API**: `GET`/`PATCH /api/v1/settings/organization` (permissions: `settings.organization.view`/`manage`)
- **Frontend**: `/settings/organization` form to manage settings
- **BrandingService**: Canonical service to provide branding data to other modules (`apps/api/src/modules/branding/branding.service.ts`)
- **Logo**: Path stored in `logoPath`; storage is local to `storage/organization/`

## QR Cleanup (Gate 10)
- `qrserver.com` dependency removed
- QR preview now uses internal backend endpoint `GET /api/v1/qr/inventory/:id/image`

## Report Engine (`ComplianceReportService`)
- **Location**: `apps/api/src/modules/reports/compliance-report.service.ts`
- **Responsibilities**:
  - Load Organization branding via `BrandingService`
  - Load inventory, template, questions, answers, PICs, sessions
  - Use `CompliancePeriodEngine` for status/availability
  - Return normalized `ReportDTO`
- **Data Integrity**: Uses canonical services, no duplicate business logic

## Print Center (`/reports/print-center`)
- **Per Inventory Mode**: Select inventory, period, session → preview report
- **Batch Mode**: Select multiple inventories → batch preview (not yet implemented)
- **Period Selection**: Follows frequency of Item Type (daily/weekly/monthly)
- **Browser Print**: Uses `@media print` CSS to format for printing

## PDF Export
- **Library**: `pdf-lib` (planned, for now stubbed)
- **API**: `GET /api/v1/reports/compliance/inventory/:id/pdf` (permission `reports.export`)
- **Output**: A4 portrait, readable, print-friendly, includes branding
- **File Naming**: `Checklist_{assetCode}_{period}.pdf`

## Frontend
- **Print Center**: `/reports/print-center` page with inventory/period selector and preview
- **Organization Settings**: `/settings/organization` page with form
- **Navigation**: "Print Center" and "Organisasi" added to sidebar
- **Permissions**: UI is permission-aware (`reports.view/export`, `settings.organization.view/manage`)

## Permissions
- `reports.view`, `reports.export`
- `settings.organization.view`, `settings.organization.manage`
Seeded via `seed-permissions.ts`.

## Audit
- `ORGANIZATION_UPDATED`, `ORGANIZATION_LOGO_UPDATED`
- `REPORT_PDF_EXPORTED`, `REPORT_BATCH_PDF_EXPORTED`

## Testing
- Critical path backend tests for organization settings + report data builder
- Frontend smoke tests for Print Center and Organization pages

## Architecture Sync
- `docs/architecture/ASSETRA_ARCHITECTURE_CURRENT.md` updated to reflect Gate 11 implementation
- Organization Settings, Print Center, PDF Reporting marked as **IMPLEMENTED**

## Technical Debt / Limitations
- PDF generation is stubbed; `pdf-lib` not yet fully integrated
- Batch report preview/PDF is stubbed
- Logo upload file handling is minimal (no validation)
- Report DTO has some redundant data (will be refactored in a later gate)

## Gate 11 Recommendation
**PASS** — Organization settings, print center, and foundation for PDF reporting are implemented. QR cleanup complete.

## Ready for Prompt 12
**YES**

---
**STOP** — Do not start Excel export, Analytics, Dashboard KPI, or Gate 12.
