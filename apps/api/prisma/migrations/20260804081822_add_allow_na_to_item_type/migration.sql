/*
  Warnings:

  - You are about to drop the column `allow_na` on the `checklist_questions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `asset_item_types` ADD COLUMN `allow_na` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `checklist_questions` DROP COLUMN `allow_na`;
