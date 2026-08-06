# EAMS BUSINESS RULES

- **Checklist Frequency**: daily, weekly, monthly.
- **Period Calculation**: Defined in `app/Helpers/period_helper.php` and `app/Helpers/calender_period_helper.php`. Note duplicate implementations exist.
- **PIC Determination**: Based on `compliance_inventory.pic` field, parsed by `collectPendingItemsForUser` in `WeeklyChecklistWhatsappReminder.php`.
- **Holidays**: `is_holiday()` (weekend) vs `is_date_offday()` (Sunday, Saturday, holidays).
