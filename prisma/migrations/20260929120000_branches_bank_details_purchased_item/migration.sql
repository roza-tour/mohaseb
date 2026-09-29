-- الفروع (اسم فقط)، والحساب البنكي للتحويل، ومربع البرنامج/الخدمة المشتراة في الفاتورة

-- AlterTable
ALTER TABLE `Invoice` ADD COLUMN `bankDetails` TEXT NULL,
    ADD COLUMN `branchId` VARCHAR(191) NULL,
    ADD COLUMN `purchasedItem` TEXT NULL;

-- CreateTable
CREATE TABLE `Branch` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Branch_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
