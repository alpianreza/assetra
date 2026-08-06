# Assetra Gate 06 — Inventory & Relational PIC Implementation

## Overview
This document describes the implementation of Inventory & Relational PIC for Assetra, built on the Gate 05 Auth baseline.

## Inventory Domain

### Canonical Table
- **Table**: `compliance_inventory`
- **Purpose**: Central inventory management for compliance assets

### Duplicate Inventory Domain
- **PASS** — No duplicate domains created. Uses existing `compliance_inventory` table as the canonical source.

## Inventory CRUD

### List (`GET /api/v1/inventory`)
- Supports search, itemType, category, area, status, PIC filters
- Pagination via `page` and `limit` parameters
- Returns: `{ items: [...], meta: { page, limit, total, totalPages } }`

### Detail (`GET /api/v1/inventory/:id`)
- Returns full inventory details including category, area, itemType, and PIC users
- Excludes sensitive data (passwordHash, session tokens)

### Create (`POST /api/v1/inventory`)
- Validates foreign keys (itemTypeId, areaId)
- Validates unique assetCode
- Validates PIC users are active
- Atomic transaction: creates inventory +PIC assignments together
- Audit log: `INVENTORY_CREATED`

### Update (`PATCH /api/v1/inventory/:id`)
- Syncs PIC assignments (add/remove without duplicates)
- Updates derived category from itemType
- Audit log: `INVENTORY_UPDATED`, `INVENTORY_PIC_CHANGED`

### Status (`PATCH /api/v1/inventory/:id/status`)
- Dedicated endpoint for status changes
- Audit log: `INVENTORY_STATUS_CHANGED`

### Delete (`DELETE /api/v1/inventory/:id`)
- **Delete Safety**: Rejects if inventory has checklist logs or evidence
- Removes PIC assignments along with inventory
- Audit log: `INVENTORY_DELETED`

## Relations

### Item Type → Category Derived
- Category is derived from Item Type
- No duplicate storage; categoryName displayed from joined query

### Area
- Many inventories can belong to one area
- Delete prevented if area has inventories

### PIC (Relational)
- **Relational**: YES — `inventory_pic_assignments` junction table
- **Multiple PIC**: YES — One inventory can have multiple PICs
- **Unique Assignment**: `inventoryId + userId` unique constraint enforced
- **Active User Selection**: Only active users available for new assignments
- **Inactive Existing PIC Preserved**: Inactive users' assignments remain visible with "Nonaktif" badge

## Search & Filter
| Filter | Implementation |
|--------|---------------|
| Search | Text search on assetCode, typeDescription, specificArea, remark |
| Item Type | Filter by itemTypeId |
| Category | Filter by categoryId |
| Area | Filter by areaId |
| Status | Filter by status (active/inactive) |
| PIC | Filter by picId |
| Pagination | page/limit parameters |

## Delete Safety
| Scenario | Behavior |
|----------|----------|
| Unused Inventory | Hard delete allowed |
| Historical Inventory | Rejected with conflict message |

## Authorization

### Permissions Added
| Permission | Origin |
|------------|--------|
| `inventory.view` | Seed + Permission Catalog |
| `inventory.create` | Seed + Permission Catalog |
| `inventory.update` | Seed + Permission Catalog |
| `inventory.delete` | Seed + Permission Catalog |

### Endpoint Permission Mapping
| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | /inventory | `inventory.view` |
| GET | /inventory/:id | `inventory.view` |
| POST | /inventory | `inventory.create` |
| PATCH | /inventory/:id | `inventory.update` |
| PATCH | /inventory/:id/status | `inventory.update` |
| DELETE | /inventory/:id | `inventory.delete` |

## Audit
| Event | When |
|-------|------|
| `INVENTORY_CREATED` | On create |
| `INVENTORY_UPDATED` | On update |
| `INVENTORY_STATUS_CHANGED` | On status change |
| `INVENTORY_PIC_CHANGED` | When PIC assignments change |
| `INVENTORY_DELETED` | On delete |

## Frontend

### Inventory List (`/inventory`)
- Responsive table (desktop) / cards (mobile)
- Columns: No. Inventaris, Jenis Item, Kategori, Area, Lokasi, PIC, Status, Aksi
- Filter bar with search, item type, area, status
- Permission-aware: Tambah button shown only if `inventory.create`

### Responsive Mobile
- Cards layout for small screens
- Key info prominently displayed

### Create/Edit (`/inventory/new`, `/inventory/:id/edit`)
- Form fields: Nomor Inventaris, Jenis Item (triggers category), Area, Lokasi Spesifik, PIC, Status, Catatan
- Category display-only (derived from Item Type)
- PIC multi-select with active users only

### PIC Multi-select
- Searchable by name
- Selected users shown as chips
- Inactive PICs preserved in edit mode with "(Nonaktif)" indicator

### Inventory Detail (`/inventory/:id`)
- Dedicated page with sections: Informasi, Lokasi, PIC, Status, Metadata
- Future placeholders: Checklist, Riwayat

### Permission-aware UI
- Menu items visible only if `inventory.view`
- Action buttons (Edit, Delete) only if permissions allow

## Tests

### Backend Tests (6 new, total 21)
| Test | Status |
|------|--------|
| Create inventory + multiple PIC atomic | PASS |
| Duplicate inventory identifier rejected | PASS |
| Inactive user cannot be assigned as new PIC | PASS |
| Updating PIC sync works without duplicates | PASS |
| Inventory with compliance history cannot be deleted | PASS |
| Unauthorized inventory endpoint returns 403 | PASS |

### Frontend Tests
- Smoke tests existing app (8 tests)
- PASS — All existing tests pass

### Manual Validation
- [x] Create Inventory: Login Super Admin → Inventaris → Tambah Inventaris → pilih Item Type → category muncul otomatis → pilih Area → pilih 2 PIC → Save
- [x] Multiple PIC: Verify both PICs saved in assignment table
- [x] Edit PIC: Remove 1 PIC, add another → Verify correct sync
- [x] Inactive PIC: Verify preserved with Nonaktif badge
- [x] Search/Filter: Verify pagination
- [x] Delete Safety: Verify reject on inventory with history

## Database

### Schema Changed
- **NO** — No new migrations created
- Schema already contains all required fields and constraints

### Migration Status
- Schema valid: PASS
- No pending migrations required

## Validation

| Check | Result |
|-------|--------|
| Lint | PASS (138 warnings, pre-existing in other modules) |
| Typecheck | PASS |
| Test | PASS (21 tests) |
| Build | PASS |

## Technical Debt / Limitations
1. Status enum supports `active`, `inactive`, `maintenance`, `disposed` — future lifecycle states may need addition as business evolves

## Gate 06 Recommendation
**PASS** — All critical-path requirements met. Ready for Prompt 07.

## Ready for Prompt 07
**YES**

---

### File Changes Summary

**Backend (New):**
- `apps/api/src/modules/inventory/inventory.module.ts`
- `apps/api/src/modules/inventory/inventory.controller.ts`
- `apps/api/src/modules/inventory/inventory.service.ts`
- `apps/api/src/modules/inventory/inventory.dto.ts`
- `apps/api/test/inventory.e2e.spec.ts`

**Backend (Modified):**
- `apps/api/src/app.module.ts` — Added InventoryModule
- `apps/api/src/modules/roles/roles.service.ts` — Added inventory permissions
- `apps/api/src/scripts/seed-permissions.ts` — Added inventory permissions catalog

**Frontend (New):**
- `apps/web/src/features/inventory/api.ts`
- `apps/web/src/features/inventory/hooks.ts`
- `apps/web/src/features/inventory/types/index.ts`
- `apps/web/src/features/inventory/pages/InventoryPage.tsx`
- `apps/web/src/features/inventory/pages/InventoryDetail.tsx`
- `apps/web/src/features/inventory/pages/InventoryForm.tsx`

**Frontend (Modified):**
- `apps/web/src/app/App.tsx` — Added inventory routes
- `apps/web/src/layouts/Layout.tsx` — Updated navigation (renamed Inventory to Inventaris)
- `apps/api/src/modules/master-data/areas/areas.dto.ts` — Fixed typo in MaxLength decorator (pre-existing)

**Pre-existing Bug Fixes (within scope):**
- `apps/web/src/features/master-data/pages/AreasPage.tsx` — Missing useState for formOpen
- `apps/web/src/features/master-data/pages/CategoriesPage.tsx` — Wrong import path
- `apps/web/src/features/master-data/pages/ItemTypesPage.tsx` — Wrong import path
- `apps/web/src/features/settings/pages/SettingsPage.tsx` — Missing setEditingHoliday
- `apps/web/src/features/master-data/components/MasterDataForm.tsx` — Error message typing fix