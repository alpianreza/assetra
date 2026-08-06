-- Align the physical database with the current Prisma schema.
-- `checklist_questions.allow_na` was already removed by migration
-- 20260804081822_add_allow_na_to_item_type, so it must not be dropped again.

-- Required by Checklist Master's per-question "Wajib foto" option.
ALTER TABLE `checklist_questions`
    ADD COLUMN `require_photo` BOOLEAN NOT NULL DEFAULT false;

-- One inventory row always represents one physical asset, so quantity is not
-- part of Assetra inventory (confirmed product rule).
ALTER TABLE `compliance_inventory`
    DROP COLUMN `qty`;
