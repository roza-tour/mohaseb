-- خانات أمر التكليف الاختيارية (المركبة، الاعتماد، التنقّل) وبنود إضافية حرة.
-- عمودا JSON حتى تُضاف خانات جديدة لاحقاً بلا هجرة.

-- AlterTable
ALTER TABLE `TaskOrder` ADD COLUMN `fields` JSON NULL,
    ADD COLUMN `extraRows` JSON NULL;
