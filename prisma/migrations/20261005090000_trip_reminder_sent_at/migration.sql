-- تذكير قبل كل رحلة بعينها بدل الملخّص اليومي: نحفظ متى أُرسل تذكير الرحلة
-- حتى لا يتكرر كل يوم ما دامت الرحلة داخل مهلة التذكير.

-- AlterTable
ALTER TABLE `Trip` ADD COLUMN `reminderSentAt` DATETIME(3) NULL;
