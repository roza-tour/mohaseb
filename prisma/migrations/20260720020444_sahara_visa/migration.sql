-- AlterTable
ALTER TABLE `Settings` ADD COLUMN `agencyRC` VARCHAR(191) NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE `VisaApplication` (
    `id` VARCHAR(191) NOT NULL,
    `refNumber` VARCHAR(191) NOT NULL,
    `wilaya` VARCHAR(191) NOT NULL,
    `wilayasConcernees` VARCHAR(191) NOT NULL DEFAULT '',
    `arrivalDate` DATETIME(3) NOT NULL,
    `departureDate` DATETIME(3) NOT NULL,
    `programDetail` TEXT NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VisaTraveler` (
    `id` VARCHAR(191) NOT NULL,
    `applicationId` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `prenom` VARCHAR(191) NOT NULL,
    `dateNaissance` DATETIME(3) NULL,
    `lieuNaissance` VARCHAR(191) NOT NULL DEFAULT '',
    `lieuResidence` VARCHAR(191) NOT NULL DEFAULT '',
    `typePasseport` VARCHAR(191) NOT NULL DEFAULT 'Passeport ordinaire',
    `numeroPasseport` VARCHAR(191) NOT NULL,
    `dateDelivrance` DATETIME(3) NULL,
    `dateExpiration` DATETIME(3) NULL,
    `nationalite` VARCHAR(191) NOT NULL DEFAULT '',
    `visaAnterieur` BOOLEAN NOT NULL DEFAULT false,
    `visaEmission` DATETIME(3) NULL,
    `visaExpirationA` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VisaTraveler` ADD CONSTRAINT `VisaTraveler_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `VisaApplication`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
