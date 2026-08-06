# EAMS AUTH & RBAC

- Roles: admin, staff, compliance, auditor, office.
- User management: `UserController` + `UserRoleModel`.
- Permission: `permission` field in `users` table + `page_access` (JSON).
- `access_helper.php` handles access control.
