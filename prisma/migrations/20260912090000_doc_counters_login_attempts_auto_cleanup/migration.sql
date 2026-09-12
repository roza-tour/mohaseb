-- معالجة الأرقام المكررة قبل إضافة قيد التفرّد.
-- الترقيم القديم كان "عدد مستندات السنة + 1"، فحذف مستند يعيد استعمال رقمه.
-- نُبقي أقدم سجل برقمه الأصلي ونلحق بالمكرّرات لاحقة "-DUP-<id>" حتى لا تفشل الهجرة.
-- (لو لم يكن عندك أي تكرار فهذه الأوامر لا تغيّر شيئاً.)
UPDATE `Invoice` SET `invoiceNumber` = CONCAT(`invoiceNumber`, '-DUP-', `id`)
WHERE `invoiceNumber` IN (SELECT n FROM (SELECT `invoiceNumber` AS n FROM `Invoice` GROUP BY `invoiceNumber` HAVING COUNT(*) > 1) AS dup_Invoice)
  AND `id` NOT IN (SELECT k FROM (SELECT MIN(`id`) AS k FROM `Invoice` GROUP BY `invoiceNumber`) AS keep_Invoice);
UPDATE `Payment` SET `receiptNumber` = CONCAT(`receiptNumber`, '-DUP-', `id`)
WHERE `receiptNumber` IN (SELECT n FROM (SELECT `receiptNumber` AS n FROM `Payment` GROUP BY `receiptNumber` HAVING COUNT(*) > 1) AS dup_Payment)
  AND `id` NOT IN (SELECT k FROM (SELECT MIN(`id`) AS k FROM `Payment` GROUP BY `receiptNumber`) AS keep_Payment);
UPDATE `Document` SET `docNumber` = CONCAT(`docNumber`, '-DUP-', `id`)
WHERE `docNumber` IN (SELECT n FROM (SELECT `docNumber` AS n FROM `Document` GROUP BY `docNumber` HAVING COUNT(*) > 1) AS dup_Document)
  AND `id` NOT IN (SELECT k FROM (SELECT MIN(`id`) AS k FROM `Document` GROUP BY `docNumber`) AS keep_Document);
UPDATE `Invitation` SET `refNumber` = CONCAT(`refNumber`, '-DUP-', `id`)
WHERE `refNumber` IN (SELECT n FROM (SELECT `refNumber` AS n FROM `Invitation` GROUP BY `refNumber` HAVING COUNT(*) > 1) AS dup_Invitation)
  AND `id` NOT IN (SELECT k FROM (SELECT MIN(`id`) AS k FROM `Invitation` GROUP BY `refNumber`) AS keep_Invitation);
UPDATE `VisaApplication` SET `refNumber` = CONCAT(`refNumber`, '-DUP-', `id`)
WHERE `refNumber` IN (SELECT n FROM (SELECT `refNumber` AS n FROM `VisaApplication` GROUP BY `refNumber` HAVING COUNT(*) > 1) AS dup_VisaApplication)
  AND `id` NOT IN (SELECT k FROM (SELECT MIN(`id`) AS k FROM `VisaApplication` GROUP BY `refNumber`) AS keep_VisaApplication);

-- AlterTable
ALTER TABLE `Customer` MODIFY `companions` JSON NULL;

-- AlterTable
ALTER TABLE `Document` MODIFY `style` JSON NULL;

-- AlterTable
ALTER TABLE `DocumentTemplate` MODIFY `style` JSON NULL;

-- AlterTable
ALTER TABLE `Invitation` MODIFY `people` JSON NOT NULL;

-- AlterTable
ALTER TABLE `Invoice` MODIFY `items` JSON NOT NULL;

-- AlterTable
ALTER TABLE `Settings` ADD COLUMN `autoCleanupDaysAfter` INTEGER NOT NULL DEFAULT 90,
    ADD COLUMN `autoCleanupEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `lastCleanupAt` DATETIME(3) NULL,
    MODIFY `docStyle` JSON NULL;

-- CreateTable
CREATE TABLE `Counter` (
    `kind` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `lastNumber` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`kind`, `year`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LoginAttempt` (
    `email` VARCHAR(191) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Document_docNumber_key` ON `Document`(`docNumber`);

-- CreateIndex
CREATE INDEX `Document_docDate_idx` ON `Document`(`docDate`);

-- CreateIndex
CREATE UNIQUE INDEX `Invitation_refNumber_key` ON `Invitation`(`refNumber`);

-- CreateIndex
CREATE UNIQUE INDEX `Invoice_invoiceNumber_key` ON `Invoice`(`invoiceNumber`);

-- CreateIndex
CREATE INDEX `Invoice_docDate_idx` ON `Invoice`(`docDate`);

-- CreateIndex
CREATE UNIQUE INDEX `Payment_receiptNumber_key` ON `Payment`(`receiptNumber`);

-- CreateIndex
CREATE INDEX `Payment_paidAt_idx` ON `Payment`(`paidAt`);

-- CreateIndex
CREATE INDEX `TaskOrder_taskDate_idx` ON `TaskOrder`(`taskDate`);

-- CreateIndex
CREATE INDEX `Transaction_date_idx` ON `Transaction`(`date`);

-- CreateIndex
CREATE INDEX `Trip_startDate_idx` ON `Trip`(`startDate`);

-- CreateIndex
CREATE INDEX `Trip_endDate_idx` ON `Trip`(`endDate`);

-- CreateIndex
CREATE UNIQUE INDEX `VisaApplication_refNumber_key` ON `VisaApplication`(`refNumber`);


-- تهيئة عدّاد الأرقام من أعلى رقم مستعمل فعلاً في كل سنة،
-- حتى يكمل الترقيم من حيث انتهى بدل أن يبدأ من 1.
INSERT INTO `Counter` (`kind`, `year`, `lastNumber`)
SELECT 'invoice', YEAR(`docDate`), MAX(CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(`invoiceNumber`, '/', -1), '-', 1) AS UNSIGNED)) FROM `Invoice`
WHERE SUBSTRING_INDEX(SUBSTRING_INDEX(`invoiceNumber`, '/', -1), '-', 1) REGEXP '^[0-9]+$' GROUP BY YEAR(`docDate`)
ON DUPLICATE KEY UPDATE `lastNumber` = GREATEST(`lastNumber`, VALUES(`lastNumber`));

INSERT INTO `Counter` (`kind`, `year`, `lastNumber`)
SELECT 'receipt', YEAR(`paidAt`), MAX(CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(`receiptNumber`, '/', -1), '-', 1) AS UNSIGNED)) FROM `Payment`
WHERE SUBSTRING_INDEX(SUBSTRING_INDEX(`receiptNumber`, '/', -1), '-', 1) REGEXP '^[0-9]+$' GROUP BY YEAR(`paidAt`)
ON DUPLICATE KEY UPDATE `lastNumber` = GREATEST(`lastNumber`, VALUES(`lastNumber`));

INSERT INTO `Counter` (`kind`, `year`, `lastNumber`)
SELECT 'document', YEAR(`docDate`), MAX(CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(`docNumber`, '/', -1), '-', 1) AS UNSIGNED)) FROM `Document`
WHERE SUBSTRING_INDEX(SUBSTRING_INDEX(`docNumber`, '/', -1), '-', 1) REGEXP '^[0-9]+$' GROUP BY YEAR(`docDate`)
ON DUPLICATE KEY UPDATE `lastNumber` = GREATEST(`lastNumber`, VALUES(`lastNumber`));

INSERT INTO `Counter` (`kind`, `year`, `lastNumber`)
SELECT 'invitation', YEAR(`docDate`), MAX(CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(`refNumber`, '/', -1), '-', 1) AS UNSIGNED)) FROM `Invitation`
WHERE SUBSTRING_INDEX(SUBSTRING_INDEX(`refNumber`, '/', -1), '-', 1) REGEXP '^[0-9]+$' GROUP BY YEAR(`docDate`)
ON DUPLICATE KEY UPDATE `lastNumber` = GREATEST(`lastNumber`, VALUES(`lastNumber`));

INSERT INTO `Counter` (`kind`, `year`, `lastNumber`)
SELECT 'visa', YEAR(`createdAt`), MAX(CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(`refNumber`, '/', -1), '-', 1) AS UNSIGNED)) FROM `VisaApplication`
WHERE SUBSTRING_INDEX(SUBSTRING_INDEX(`refNumber`, '/', -1), '-', 1) REGEXP '^[0-9]+$' GROUP BY YEAR(`createdAt`)
ON DUPLICATE KEY UPDATE `lastNumber` = GREATEST(`lastNumber`, VALUES(`lastNumber`));
