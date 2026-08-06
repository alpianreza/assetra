-- Align the physical database with the current Prisma schema.
-- `require_photo` is used by Checklist Master and was missing from migrations,
-- which caused PATCH /checklist-templates/:id/questions to fail with HTTP 500.

ALTER TABLE `checklist_questions`
    DROP COLUMN `allow_na`,
    ADD COLUMN `require_photo` BOOLEAN NOT NULL DEFAULT false;

-- One inventory row always represents one physical asset, so quantity is not
-- part of Assetra inventory (confirmed product rule).
ALTER TABLE `compliance_inventory`
    DROP COLUMN `qty`;
