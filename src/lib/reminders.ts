import { prisma } from "@/lib/prisma";

export async function getUpcomingTrips(daysAheadOverride?: number) {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const daysAhead = daysAheadOverride ?? settings?.reminderDaysAhead ?? 7;

  const now = new Date();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + daysAhead);

  const trips = await prisma.trip.findMany({
    where: {
      startDate: { gte: now, lte: horizon },
      status: { notIn: ["CANCELLED", "COMPLETED"] },
    },
    include: { program: true, customer: true },
    orderBy: { startDate: "asc" },
  });

  return trips.map((t) => ({
    id: t.id,
    programName: t.program.name,
    customerName: t.customer.name,
    startDate: t.startDate,
    daysRemaining: Math.ceil((t.startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    status: t.status,
  }));
}
