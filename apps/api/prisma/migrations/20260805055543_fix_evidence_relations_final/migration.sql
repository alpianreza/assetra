/*
  Warnings:

  - Made the column `checklistLogId` on table `evidence` required. This step will fail if there are existing NULL values in that column.
  - Made the column `inventoryId` on table `evidence` required. This step will fail if there are existing NULL values in that column.
  - Made the column `uploadedById` on table `evidence` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `evidence` DROP FOREIGN KEY `evidence_checklistLogId_fkey`;

-- DropForeignKey
ALTER TABLE `evidence` DROP FOREIGN KEY `evidence_inventoryId_fkey`;

-- AlterTable
ALTER TABLE `evidence` MODIFY `checklistLogId` INTEGER NOT NULL,
    MODIFY `inventoryId` INTEGER NOT NULL,
    MODIFY `uploadedById` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `evidence` ADD CONSTRAINT `evidence_checklistLogId_fkey` FOREIGN KEY (`checklistLogId`) REFERENCES `checklist_logs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evidence` ADD CONSTRAINT `evidence_inventoryId_fkey` FOREIGN KEY (`inventoryId`) REFERENCES `compliance_inventory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evidence` ADD CONSTRAINT `evidence_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
