-- تبسيط الفروع: الفرع اسم فقط (بالعربية والفرنسية والإنجليزية)، ولا يحمل
-- ترويسة ولا شعاراً ولا ختماً ولا حساباً بنكياً — الفاتورة تبقى للوكالة كما هي.
-- والحساب المحوَّل إليه يُكتب في الفاتورة نفسها بلا علامة تفعيل.

-- AlterTable: أسماء الفرع بلغات الفواتير
ALTER TABLE `Branch` ADD COLUMN `nameFr` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `nameEn` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable: إسقاط بيانات الفرع التي لم تُعد مستعملة
ALTER TABLE `Branch` DROP COLUMN `tagline`,
    DROP COLUMN `address`,
    DROP COLUMN `phone`,
    DROP COLUMN `email`,
    DROP COLUMN `website`,
    DROP COLUMN `rc`,
    DROP COLUMN `logoPath`,
    DROP COLUMN `stampPath`,
    DROP COLUMN `letterheadColor`,
    DROP COLUMN `bankDetails`;

-- AlterTable: الحساب المحوَّل إليه يظهر إن كُتب، فلا حاجة لعلامة تفعيل
ALTER TABLE `Invoice` DROP COLUMN `showBankDetails`;

-- AlterTable: حساب بنكي عام في الإعدادات لم يُعد مستعملاً
ALTER TABLE `Settings` DROP COLUMN `bankDetails`;
