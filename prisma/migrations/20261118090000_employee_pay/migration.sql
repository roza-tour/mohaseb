-- نظام أجر الموظف لبيان الراتب (راتب ثابت / نسبة / الاثنان)
ALTER TABLE `Employee` ADD COLUMN `payType` VARCHAR(191) NOT NULL DEFAULT 'salary',
    ADD COLUMN `baseSalary` DOUBLE NULL,
    ADD COLUMN `commissionRate` DOUBLE NULL;
