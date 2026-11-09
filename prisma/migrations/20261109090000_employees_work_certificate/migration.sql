-- الموقّع على شهادات العمل ومدينة التحرير (تُحفظ من آخر شهادة)
ALTER TABLE `Settings` ADD COLUMN `agencyCity` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `managerName` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `managerTitle` VARCHAR(191) NOT NULL DEFAULT '';

-- موظفو الوكالة (لإصدار شهادات العمل)
CREATE TABLE `Employee` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL DEFAULT '',
    `gender` VARCHAR(191) NOT NULL DEFAULT 'M',
    `birthDate` DATETIME(3) NULL,
    `birthPlace` VARCHAR(191) NULL,
    `idNumber` VARCHAR(191) NULL,
    `socialSecurityNo` VARCHAR(191) NULL,
    `jobTitle` VARCHAR(191) NULL,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
