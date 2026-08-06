# 06_COMPLIANCE_ENGINE.md

- **Status**: `ok`, `not_ok`, `na`.
- **Config**: `allow_na` flag at checklist question level.
- **Rule**: If `allow_na = false` (default), status `na` is forbidden in submission. Backend validates strictly.
- **Session/Time Period**: Session configuration is data-driven. Not all checklists require session logic.
- **Uniqueness**: `inventory_id` + `template_id` + `period_key` + `session_id` (if applicable).
- **Calendar**: Single canonical service determining `isWorkingDay(date)`.
