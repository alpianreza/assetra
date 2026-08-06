# 03_DATABASE_DESIGN.md

### PIC Strategy (Relational)
- **Table**: `inventory_pic_assignments`
- **Relationship**: 
    - `users` (1) <-> (N) `inventory_pic_assignments` (N) <-> (1) `compliance_inventory`
- **Constraint**: `UNIQUE(user_id, inventory_id)`

### Compliance Enhancement
- **Table**: `checklist_questions`
- **Fields**: `id`, `template_id`, `question_text`, `answer_type`, `options_json`, `is_required`, `allow_na` (BOOLEAN).

### Checklist Session/Time Period
- **Table**: `checklist_sessions`
    - `id`, `name`, `code`, `start_time`, `end_time`, `sort_order`, `is_active`.
- **Assignment**: `checklist_template_sessions` (Link template/item to active sessions).

### Calendar/Holiday System
- **Table**: `calendar_configuration`
    - `date`, `type` (National, Company, Custom), `is_working_day` (BOOLEAN).
