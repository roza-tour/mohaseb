import { prisma } from "@/lib/prisma";

export async function getUpcomingTrips(daysAheadOverride?: number) {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const daysAhead = daysAheadOverride ?? settings?.reminderDaysAhead ?? 7;

  // بداية اليوم (UTC) حتى تظهر الرحلات التي تبدأ اليوم — تواريخ الرحلات مخزَّنة عند منتصف ليل UTC
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setUTCDate(horizon.getUTCDate() + daysAhead);
  horizon.setUTCHours(23, 59, 59, 999);

  const trips = await prisma.trip.findMany({
    where: {
      startDate: { gte: today, lte: horizon },
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
    daysRemaining: Math.round((t.startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
    status: t.status,
  }));
}
