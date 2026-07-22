-- AlterTable
ALTER TABLE `Invoice` ADD COLUMN `paid` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `publicToken` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Invitation` ADD COLUMN `paid` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `publicToken` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `ActivityLog` (
    `id` VARCHAR(191) NOT NULL,
    `userEmail` VARCHAR(191) NOT NULL DEFAULT '',
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `summary` VARCHAR(191) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ActivityLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Invoice_publicToken_key` ON `Invoice`(`publicToken`);
CREATE UNIQUE INDEX `Invitation_publicToken_key` ON `Invitation`(`publicToken`);
