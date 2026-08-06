# 05_AUTH_RBAC.md

- **Strategy**: Strong RBAC using `users`, `roles`, `permissions`.
- **Permissions Matrix**:
    - `inventory.view`, `inventory.create`, `inventory.update`, `inventory.delete`
    - `checklist.view`, `checklist.perform`, `checklist.override`
    - `report.view`, `report.export`
    - `users.manage`, `roles.manage`
- **Session**: Same-origin cookies (secure, HTTPOnly).
