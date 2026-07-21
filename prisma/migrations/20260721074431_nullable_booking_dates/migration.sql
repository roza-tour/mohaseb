-- AlterTable
ALTER TABLE `FlightBooking` MODIFY `departureDate` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `HotelBooking` MODIFY `checkIn` DATETIME(3) NULL,
    MODIFY `checkOut` DATETIME(3) NULL;
