-- مكان التحرير مع التاريخ في كل المستندات («المسيلة في ...» / «M'Sila, le ...»)
ALTER TABLE `Settings` ADD COLUMN `cityAr` VARCHAR(191) NOT NULL DEFAULT 'المسيلة',
    ADD COLUMN `cityFr` VARCHAR(191) NOT NULL DEFAULT 'M''Sila';
