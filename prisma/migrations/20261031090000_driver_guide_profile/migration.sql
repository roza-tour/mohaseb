-- بيانات ثابتة للسائق والمرشد تُملأ تلقائياً في أوامر التكليف
ALTER TABLE `Driver` ADD COLUMN `fields` JSON NULL;
ALTER TABLE `Guide` ADD COLUMN `fields` JSON NULL;
