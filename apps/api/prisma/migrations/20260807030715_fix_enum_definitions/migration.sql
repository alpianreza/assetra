-- AlterTable
ALTER TABLE `audit_logs` MODIFY `entityType` VARCHAR(191) NULL,
    MODIFY `ipAddress` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `sessions` MODIFY `ipAddress` VARCHAR(191) NULL;
