-- أمر التكليف لم يعد مُلزَماً بالارتباط برحلة (يمكن كتابة البرنامج والعميل يدوياً)
ALTER TABLE `TaskOrder` MODIFY `tripId` VARCHAR(191) NULL;
