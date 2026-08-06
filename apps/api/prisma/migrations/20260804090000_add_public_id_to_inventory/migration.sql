-- Add publicId column for QR identification (unique, unguessable)
ALTER TABLE `compliance_inventory` ADD COLUMN `publicId` VARCHAR(64) NULL;

-- Backfill existing rows with generated unique identifiers (cuid-like)
UPDATE `compliance_inventory` SET `publicId` = CONCAT('ci_', MD5(CONCAT(id, RAND())));

-- Enforce NOT NULL and UNIQUE now that backfill is complete
ALTER TABLE `compliance_inventory` MODIFY COLUMN `publicId` VARCHAR(64) NOT NULL;
CREATE UNIQUE INDEX `compliance_inventory_publicId_key` ON `compliance_inventory`(`publicId`);
