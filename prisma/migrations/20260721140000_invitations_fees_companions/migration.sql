-- AlterTable: Customer passport + companions
ALTER TABLE `Customer` ADD COLUMN `passport` VARCHAR(191) NULL,
    ADD COLUMN `companions` JSON NULL;

-- AlterTable: VisaApplication service fee
ALTER TABLE `VisaApplication` ADD COLUMN `feePerPerson` DOUBLE NOT NULL DEFAULT 40,
    ADD COLUMN `feeCurrency` VARCHAR(191) NOT NULL DEFAULT 'USD';

-- AlterTable: Transaction links to invitation / visa application
ALTER TABLE `Transaction` ADD COLUMN `invitationId` VARCHAR(191) NULL,
    ADD COLUMN `visaApplicationId` VARCHAR(191) NULL;

-- CreateTable: Invitation
CREATE TABLE `Invitation` (
    `id` VARCHAR(191) NOT NULL,
    `refNumber` VARCHAR(191) NOT NULL,
    `language` VARCHAR(191) NOT NULL DEFAULT 'fr',
    `consulate` VARCHAR(191) NOT NULL DEFAULT '',
    `people` JSON NOT NULL,
    `programId` VARCHAR(191) NULL,
    `itinerary` TEXT NULL,
    `arrivalDate` DATETIME(3) NULL,
    `departureDate` DATETIME(3) NULL,
    `fee` DOUBLE NOT NULL DEFAULT 20,
    `feeCurrency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `notes` TEXT NULL,
    `docDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Transaction_invitationId_idx` ON `Transaction`(`invitationId`);
CREATE INDEX `Transaction_visaApplicationId_idx` ON `Transaction`(`visaApplicationId`);
CREATE INDEX `Invitation_programId_idx` ON `Invitation`(`programId`);

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `Invitation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_visaApplicationId_fkey` FOREIGN KEY (`visaApplicationId`) REFERENCES `VisaApplication`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Invitation` ADD CONSTRAINT `Invitation_programId_fkey` FOREIGN KEY (`programId`) REFERENCES `TourProgram`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
