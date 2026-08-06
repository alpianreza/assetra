-- Add organization branding fields for Gate 11
ALTER TABLE `organization`
  ADD COLUMN `shortName` VARCHAR(50) NULL,
  ADD COLUMN `phone` VARCHAR(50) NULL,
  ADD COLUMN `email` VARCHAR(255) NULL,
  ADD COLUMN `website` VARCHAR(255) NULL,
  ADD COLUMN `reportFooter` TEXT NULL;