-- تنسيق افتراضي للمستندات يسري على كل المستندات المولَّدة
ALTER TABLE `Settings` ADD COLUMN `docStyle` JSON NULL;
