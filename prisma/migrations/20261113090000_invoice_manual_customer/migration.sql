-- عميل الفاتورة مكتوب يدوياً (اسم + بيانات اختيارية) بدل اختياره من العملاء المسجَّلين
ALTER TABLE `Invoice` ADD COLUMN `customerName` VARCHAR(191) NULL,
    ADD COLUMN `customerDetails` TEXT NULL;
