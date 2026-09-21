// قراءة الرحلات وأسمائها بشكل لا ينكسر.
//
// المشكلة: Prisma يرمي خطأ خادم (500) إذا طُلبت علاقة إلزامية وكان سجلها مفقوداً:
//   Inconsistent query result: Field program is required to return data, got `null`
// أي أن **رحلة واحدة** برنامجها أو عميلها محذوف كانت تُسقط صفحات كاملة —
// الفواتير والرحلات والقيود والمستندات والتقويم وكل قائمة تعرض اسم رحلة.
// تحدث هذه الحالة عند حذف صفوف يدوياً من phpMyAdmin أو استعادة نسخة احتياطية
// ناقصة (بتعطيل قيود المفاتيح الأجنبية)، لا من داخل البرنامج.
//
// الحل: نقرأ الجداول منفصلة ونربطها في الذاكرة. السجل الناقص يظهر باسم واضح
// («برنامج محذوف» / «عميل محذوف») ويبقى بقية الصفحة شغّالاً.
import { prisma } from "./prisma";
import type { Prisma, Trip } from "@prisma/client";

export const MISSING_PROGRAM = "⚠️ برنامج محذوف";
export const MISSING_CUSTOMER = "⚠️ عميل محذوف";
export const MISSING_TRIP = "⚠️ رحلة محذوفة";

export type TripWithNames = Trip & {
  programName: string;
  customerName: string;
  programDurationDays: number;
  programItinerary: string | null;
};

// يضيف اسم البرنامج واسم العميل لمجموعة رحلات دون المرور بعلاقات إلزامية
export async function attachTripNames(trips: Trip[]): Promise<TripWithNames[]> {
  if (trips.length === 0) return [];
  const [programs, customers] = await Promise.all([
    prisma.tourProgram.findMany({
      where: { id: { in: [...new Set(trips.map((t) => t.programId))] } },
      select: { id: true, name: true, durationDays: true, itinerary: true },
    }),
    prisma.customer.findMany({
      where: { id: { in: [...new Set(trips.map((t) => t.customerId))] } },
      select: { id: true, name: true },
    }),
  ]);
  const programById = new Map(programs.map((p) => [p.id, p]));
  const customerName = new Map(customers.map((c) => [c.id, c.name]));

  return trips.map((t) => {
    const program = programById.get(t.programId);
    return {
      ...t,
      programName: program?.name ?? MISSING_PROGRAM,
      programDurationDays: program?.durationDays ?? 0,
      programItinerary: program?.itinerary ?? null,
      customerName: customerName.get(t.customerId) ?? MISSING_CUSTOMER,
    };
  });
}

// رحلات بأسمائها — بديل آمن لـ findMany({ include: { program, customer } })
export async function findTripsWithNames(args?: {
  where?: Prisma.TripWhereInput;
  orderBy?: Prisma.TripOrderByWithRelationInput;
  skip?: number;
  take?: number;
}): Promise<TripWithNames[]> {
  const trips = await prisma.trip.findMany({
    where: args?.where,
    orderBy: args?.orderBy,
    skip: args?.skip,
    take: args?.take,
  });
  return attachTripNames(trips);
}

// رحلة واحدة بأسمائها (أو null إن لم توجد)
export async function findTripWithNames(id: string): Promise<TripWithNames | null> {
  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) return null;
  return (await attachTripNames([trip]))[0];
}

// خريطة رحلات بأسمائها لقوائم تعرض اسم رحلة بجانب كل سطر
// (فواتير، قيود، مستندات، أوامر تكليف). غياب المفتاح = الرحلة نفسها محذوفة.
export async function loadTripsById(
  tripIds: (string | null | undefined)[]
): Promise<Map<string, TripWithNames>> {
  const ids = [...new Set(tripIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return new Map();
  const trips = await findTripsWithNames({ where: { id: { in: ids } } });
  return new Map(trips.map((t) => [t.id, t]));
}

// نص جاهز للعرض: «البرنامج — العميل»، أو تنبيه إن كانت الرحلة محذوفة
export function tripLabel(trip: TripWithNames | null | undefined, fallback = MISSING_TRIP): string {
  if (!trip) return fallback;
  return `${trip.programName} — ${trip.customerName}`;
}

// اسم البرنامج فقط (للأعمدة الضيقة)
export function tripProgramName(trip: TripWithNames | null | undefined, fallback = MISSING_TRIP): string {
  return trip?.programName ?? fallback;
}
