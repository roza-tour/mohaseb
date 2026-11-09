-- تصميم خاص لبعض المستندات الصادرة (شهادة العمل) مع بياناتها المنظَّمة
ALTER TABLE `Document` ADD COLUMN `kind` VARCHAR(191) NULL,
    ADD COLUMN `data` JSON NULL;
