# Assetra Gate 08 — Compliance / Checklist Execution

## Overview
This document describes the actual implementation of the Compliance/Checklist Execution Engine (Prompt 08). Built on Gate 07 Checklist Master (Templates, Questions, Sessions, Assignments).

## Architecture

### Canonical Compliance Period Engine
Single source of truth located at `apps/api/src/modules/compliance/period-engine.service.ts`.

Responsibilities:
- **Period generation**: daily / weekly (W1-W4) / monthly
- **Period keys**: deterministic & stable
- **Working day resolution**: delegated to `SettingsService.isWorkingDay`
- **Checklist availability**: future / offday / pending / completed / late
- **Late rules**: daily 21d, weekly 28d, monthly 90d (3 months)
- **allow_na resolution**: from AssetItemType
- **Session requirement**: template-session assignment
- **Occurrence keying**: inventory + template + period + session
- **Completion status**: derived from answer counts

### Compliance Module (`apps/api/src/modules/compliance/`)
- `compliance.service.ts` — availability, periods, execution, submission, history
- `compliance.controller.ts` — REST API
- `compliance.dto.ts` — DTOs
- `period-engine.service.ts` — canonical business rule engine

## Frequency Rules

### DAILY
- Calendar date as period key (`YYYY-MM-DD`)
- Future blocked
- Offday uses WorkingDayService (holiday override → weekday config)
- Late after 21 days

### WEEKLY (W1-W4)
- 28-day cycle: W1-W4
- **NOT ISO week** — business rule preserved from EAMS
- Week computed from anchor Monday: `weekIndex = floor(daysSinceAnchor / 7) % 4 + 1`
- Late after 28 days

### MONTHLY
- Calendar month as period key (`YYYY-MM`)
- Future blocked
- Late after 3 months (90 days)

## Sessions
- Configurable via `checklist_sessions` master data (Pagi/Siang/Sore are defaults, not hardcoded)
- Template → Session via `checklist_template_sessions`
- If template has sessions: occurrence distinguished per session
- If template has no sessions: single occurrence per period

## Allow N/A
**LOCKED RULE**: `allow_na` belongs to **AssetItemType**, NOT ChecklistQuestion.
- Resolution: inventory → itemType → allowNA
- `allow_na = true`: statuses ok / not_ok / na
- `allow_na = false`: statuses ok / not_ok
- Backend validates this rule (rejects `na` when `allowNA=false`)

## Late Rules
Single source of truth in `CompliancePeriodEngine.LATE_THRESHOLDS`:
| Frequency | Threshold |
|-----------|-----------|
| daily     | 21 days   |
| weekly    | 28 days   |
| monthly   | 90 days (3 months) |

## Working / Offday Resolution
- Delegated to canonical `SettingsService.isWorkingDay(date)`
- Priority: Holiday/date override first → WorkingDayConfiguration
- Sabtu/Minggu can be WORKING if configured

## Occurrence Uniqueness
- Application-layer enforcement via `occurrenceKey(inventoryId, templateId, periodKey, sessionId)`
- MySQL nullable composite unique quirk handled at app layer (sessionId NULL behavior)
- Header log row (questionId=null) represents the occurrence
- Recheck policy: replaces answer rows for same occurrence (no silent history loss)

## PIC Relation
- PIC assignments available in compliance responses via `inventory_pic_assignments`
- Used as source for future Reminder/Notification gates

## API
| Method | Route | Permission |
|--------|-------|------------|
| GET | `/api/v1/compliance` | `compliance.view` |
| GET | `/api/v1/compliance/inventory/:id/periods` | `compliance.view` |
| GET | `/api/v1/compliance/inventory/:id/checklist` | `compliance.view` |
| POST | `/api/v1/compliance/inventory/:id/checklist` | `compliance.execute` |
| GET | `/api/v1/compliance/inventory/:id/history` | `compliance.view` |

## Permissions
- `compliance.view`
- `compliance.execute`
- `compliance.manage`
Seeded via existing idempotent seed mechanism; assigned to Super Admin automatically.

## Audit Events
- `CHECKLIST_SUBMITTED`
- `CHECKLIST_UPDATED` (recheck)

## Frontend
### Compliance Overview (`/compliance`)
- Lists inventories with template assignments
- Responsive table (desktop) / cards (mobile)

### Inventory Compliance Detail (`/compliance/inventory/:id`)
- Period list with status (Selesai/Pending/Terlambat/Hari Libur/Belum Tersedia)
- Status computed by backend (not frontend)
- History section

### Checklist Execution (`/compliance/inventory/:id/execution`)
- Questions with answer options
- OK/Tidak OK/N/A per allowNA (from backend)
- Session selector when template uses sessions
- Submit (atomic)

## Known Limitations
1. Evidence/photo upload not yet implemented (schema supports `evidence`; deferred to reporting/evidence gate)
2. No versioning of historical answers — recheck replaces current answers (documented behavior)
3. Frontend template editor is minimal; Question ordering UI deferred to a follow-up
4. Occurrence uniqueness enforced at application layer (not DB constraint) to handle MySQL nullable composite unique behavior

## Tests
Critical business-rule tests (6) in `compliance.e2e.spec.ts`:
1. Compliance overview returns inventory with template
2. Periods endpoint returns today period
3. `allow_na=false` rejects NA submission
4. `allow_na=true` accepts NA
5. Future checklist rejected
6. Offday resolution blocks execution

All 27 backend tests pass; 8 frontend tests pass.

## Manual Validation
- [x] Overview lists assigned inventory
- [x] Periods calendar shows today's period
- [x] NA rejected when allowNA=false
- [x] NA accepted when allowNA=true
- [x] Future period blocked
- [x] Offday blocked

## Gate 08 Recommendation
**PASS** — Compliance Execution Engine implemented per business rules.
