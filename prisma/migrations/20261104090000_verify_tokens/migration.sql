-- رمز التحقق العام (QR) لأوامر التكليف وسندات القبض، مثل الفواتير والدعوات
ALTER TABLE `TaskOrder` ADD COLUMN `publicToken` VARCHAR(191) NULL;
ALTER TABLE `Payment` ADD COLUMN `publicToken` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `TaskOrder_publicToken_key` ON `TaskOrder`(`publicToken`);
CREATE UNIQUE INDEX `Payment_publicToken_key` ON `Payment`(`publicToken`);
