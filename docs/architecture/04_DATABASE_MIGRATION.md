# 04_DATABASE_MIGRATION.md

1. **Backup**: Dump existing MySQL.
2. **Analysis**: Audit table counts.
3. **Preparation**: Setup Assetra DB schema (Prisma).
4. **User Migration**: Migrate users + assign default roles.
5. **PIC Migration (Safe)**: 
    - Normalize legacy `pic` string.
    - Match exactly against `users`.
    - Auto-match unique. 
    - Create `PIC_MIGRATION_REPORT` for ambiguous matches (manual resolution required).
6. **Data Migration**: Move assets, inventory, categories, areas.
7. **Compliance Migration**: Migrate templates, questions. Include legacy `na` logs (reconcile with `allow_na` configuration).
8. **Audit Migration**: Migrate audit/activity logs.
9. **Exclusion**: Do not migrate IT Monitoring (`it_devices`...) or Patrol (`patrol_routes`...).
10. **Validation**: Run reconciliation report.
