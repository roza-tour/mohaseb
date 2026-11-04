-- رمز التحقق العام (QR) للمستندات الصادرة
ALTER TABLE `Document` ADD COLUMN `publicToken` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `Document_publicToken_key` ON `Document`(`publicToken`);
