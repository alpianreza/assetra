# Assetra Gate 05 — Master Data & Users Implementation

## Overview
This document describes the actual implementation of Prompt 05: Master Data & User Management for Assetra. All features are implemented on top of the locked Gate 04 Auth baseline.

## Backend Modules Implemented

### 1. Users Module (`apps/api/src/modules/users/`)
- **Endpoints**:
  - `GET /api/v1/users` — List with search, status filter, role filter, pagination (`users.view`)
  - `GET /api/v1/users/:id` — Get user with roles & permissions (`users.view`)
  - `POST /api/v1/users` — Create user (password hashed via Argon2id) (`users.create`)
  - `PATCH /api/v1/users/:id` — Update user (password optional) (`users.update`)
  - `PATCH /api/v1/users/:id/status` — Toggle active/inactive (`users.update`)
  - `DELETE /api/v1/users/:id` — Delete with safety checks (`users.delete`)
- **Safety Checks**:
  - Self-deletion rejected
  - Last Super Admin protection (practical, not over-engineered)
  - Password hashing via `PasswordService`
  - Audit logging via `AuditService`
  - Business-relation check: rejects delete if user has `inventory_pic_assignments`

### 2. Roles Module (`apps/api/src/modules/roles/`)
- **Endpoints**:
  - `GET /api/v1/roles` — List all roles (`roles.view`)
  - `GET /api/v1/roles/:id` — Get role with permissions (`roles.view`)
  - `POST /api/v1/roles` — Create role (`roles.manage`)
  - `PATCH /api/v1/roles/:id` — Update role & permissions (`roles.manage`)
  - `DELETE /api/v1/roles/:id` — Delete role (`roles.manage`)
  - `GET /api/v1/permissions` — Grouped permission catalog for UI (`roles.view`)
- **System Role Protection**:
  - `Super Admin` cannot be deleted or renamed
  - Centralized in `RolesService`
  - All permissions assigned to Super Admin via seed script

### 3. Master Data Modules
#### Areas (`/api/v1/master/areas`)
- Fields: `name`, `locationDetail`
- CRUD with `master.area.view` / `master.area.manage`
- Delete safety: rejects if referenced by `ComplianceInventory`
- Audit logging

#### Inventory Categories (`/api/v1/master/categories`)
- Fields: `name`, `code` (unique)
- CRUD with `master.category.view` / `master.category.manage`
- Delete safety: rejects if referenced by `AssetItemType` or `ComplianceInventory`
- Audit logging

#### Asset Item Types (`/api/v1/master/asset-item-types`)
- Fields: `name`, `code`, `categoryId`, `checklistFrequency` (daily|weekly|monthly), `active`
- CRUD with `master.item_type.view` / `master.item_type.manage`
- Delete safety: rejects if referenced by `ComplianceInventory` or `ChecklistTemplate`
- Audit logging

### 4. Settings Module (`/api/v1/settings`)
#### Working Day Configuration (`/settings/working-days`)
- GET/PATCH for 7-day configuration
- Permissions: `settings.working_day.manage`
- Saturday configurable (not hardcoded)

#### Holiday Overrides (`/settings/holidays`)
- CRUD with `settings.holiday.manage`
- Fields: `date`, `name`, `status` (WORKING/OFF)

#### Effective Working Day Service
- Single canonical method: `isWorkingDay(date: Date): Promise<boolean>`
- Logic: override first → weekday config
- Ready for future Compliance Engine

## Frontend Implementation

### Navigation (`apps/web/src/layouts/Layout.tsx`)
Updated sidebar with new structure:
- **Master Data**: Area, Kategori Inventaris, Jenis Item
- **Administration**: Pengguna, Role & Permission
- **Settings**: Hari Kerja & Libur
- Permission-aware rendering using TanStack Query auth state (no Zustand)

### User Management (`apps/web/src/features/users/`)
- `UserList.tsx` — Responsive table (desktop) / cards (mobile) with search, filter, pagination
- `UserForm.tsx` — Modal for Create/Edit with multi-role selector
- Hooks: `useUsers`, `useCreateUser`, `useUpdateUser`, `useDeleteUser`

### Role & Permission (`apps/web/src/features/roles/`)
- `RoleList.tsx` — List roles
- `RoleForm.tsx` — Create/Edit with grouped permission checkboxes
- Groups: Pengguna, Role & Permission, Master Data (Area/Category/Item Type), Settings

### Master Data (`apps/web/src/features/master-data/`)
- Shared `MasterDataTable` / `MasterDataForm` pattern
- Separate pages for Area, Category, Item Type

### Settings (`apps/web/src/features/settings/`)
- `WorkingDaySettings.tsx` — 7 toggles (Senin-Minggu)
- `HolidaySettings.tsx` — List + form for overrides
- Combined in single "Hari Kerja & Libur" page

### API Layer
- Centralized `apiRequest` helper (`apps/web/src/lib/api-helper.ts`) with automatic CSRF double-submit cookie handling
- All feature APIs use the shared helper

## Authorization
All endpoints protected with `SessionAuthGuard` + `PermissionsGuard`.
Permission mapping:
| Feature | Permissions |
|---------|-------------|
| Users | `users.view`, `users.create`, `users.update`, `users.delete` |
| Roles | `roles.view`, `roles.manage` |
| Area | `master.area.view`, `master.area.manage` |
| Category | `master.category.view`, `master.category.manage` |
| Item Type | `master.item_type.view`, `master.item_type.manage` |
| Working Day | `settings.working_day.manage` |
| Holiday | `settings.holiday.manage` |

## Testing
### Backend (15 tests)
- `auth.e2e.spec.ts` (12 tests): Auth, CSRF, Session, RBAC, Audit, Throttle
- `schema.spec.ts` (3 tests): Database constraints

### Frontend (8 tests)
- `App.test.tsx` (2 tests): Dashboard render
- `auth.test.tsx` (6 tests): Login render, redirect, loading, auth, 403, logout

All tests pass.

## Validation Pipeline
```bash
pnpm lint       # PASS
pnpm typecheck  # PASS
pnpm test       # PASS (23 total: 15 backend + 8 frontend)
pnpm build      # PASS
npx prisma validate    # PASS
npx prisma migrate status  # PASS (Database schema is up to date!)
```

## Database
- Schema: Valid
- Migration Status: Up to date (`20260803200000_init`)
- No new migrations created (existing schema sufficient)

## Documentation
Created `docs/implementation/05_MASTER_DATA_USERS.md` (this file).

## Known Limitations
1. UI for Asset Item Type frequency uses enum values (daily/weekly/monthly) — Indonesian labels in UI.
2. Last-admin protection is practical: prevents deletion if only one Super Admin exists.
3. Self-delete and self-deactivation prevented.
4. Holiday type field exists in schema but UI uses simple status toggle (WORKING/OFF).
5. Working Day / Holiday Override combined in single Settings page per requirement.

## Gate 05 Recommendation
**PASS** — All critical-path requirements met. Ready for Prompt 06.