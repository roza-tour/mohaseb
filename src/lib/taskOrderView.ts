// قراءة أوامر التكليف بشكل لا ينكسر.
//
// المشكلة: قراءة أمر التكليف مع رحلته عبر include تفشل بخطأ خادم (500) لو كان
// الأمر يشير إلى رحلة غير موجودة — وسطر واحد كهذا كان يُسقط صفحة أوامر التكليف
// كلها بـ«A server error occurred». تحدث هذه الحالة عند حذف صفوف يدوياً من
// phpMyAdmin أو استعادة نسخة احتياطية ناقصة (تعطيل قيود المفاتيح الأجنبية).
//
// الحل: نقرأ الجداول منفصلة ونربطها في الذاكرة، فالسطر اليتيم يظهر بوضوح
// «رحلة محذوفة» ويمكن حذفه أو تصحيحه، بدل أن تسقط الصفحة.
import { prisma } from "./prisma";
import type { Prisma, TaskOrder, Guide, Driver } from "@prisma/client";
import { readFields, manualTripText } from "./taskOrderFields";

export type TripSummary = {
  id: string;
  programName: string;
  customerName: string;
  startDate: Date;
  endDate: Date;
  numPax: number;
};

export type TaskOrderView = TaskOrder & {
  guide: Guide | null;
  driver: Driver | null;
  // null: الأمر بلا رحلة (مكتوب يدوياً)، أو رحلته المرتبطة محذوفة
  tripInfo: TripSummary | null;
};

// يبني خريطة ملخّصات الرحلات المطلوبة دون الاعتماد على العلاقات الإلزامية
export async function loadTripSummaries(tripIds: (string | null)[]): Promise<Map<string, TripSummary>> {
  const ids = [...new Set(tripIds.filter((x): x is string => !!x))];
  const map = new Map<string, TripSummary>();
  if (ids.length === 0) return map;

  const trips = await prisma.trip.findMany({ where: { id: { in: ids } } });
  const [programs, customers] = await Promise.all([
    prisma.tourProgram.findMany({
      where: { id: { in: [...new Set(trips.map((t) => t.programId))] } },
      select: { id: true, name: true },
    }),
    prisma.customer.findMany({
      where: { id: { in: [...new Set(trips.map((t) => t.customerId))] } },
      select: { id: true, name: true },
    }),
  ]);
  const programName = new Map(programs.map((p) => [p.id, p.name]));
  const customerName = new Map(customers.map((c) => [c.id, c.name]));

  for (const t of trips) {
    map.set(t.id, {
      id: t.id,
      programName: programName.get(t.programId) ?? "برنامج محذوف",
      customerName: customerName.get(t.customerId) ?? "عميل محذوف",
      startDate: t.startDate,
      endDate: t.endDate,
      numPax: t.numPax,
    });
  }
  return map;
}

// أوامر التكليف مع بيانات رحلاتها — لا ترمي خطأ مهما كانت البيانات ناقصة
export async function findTaskOrders(args: {
  where?: Prisma.TaskOrderWhereInput;
  orderBy?: Prisma.TaskOrderOrderByWithRelationInput;
  skip?: number;
  take?: number;
}): Promise<TaskOrderView[]> {
  const orders = await prisma.taskOrder.findMany({
    where: args.where,
    orderBy: args.orderBy,
    skip: args.skip,
    take: args.take,
    include: { guide: true, driver: true }, // علاقتان اختياريتان — آمنتان
  });
  const trips = await loadTripSummaries(orders.map((o) => o.tripId));
  return orders.map((o) => ({ ...o, tripInfo: (o.tripId && trips.get(o.tripId)) || null }));
}

// أمر تكليف واحد بنفس الضمانة (للـ PDF وصفحة التعديل)
export async function findTaskOrder(id: string): Promise<TaskOrderView | null> {
  const order = await prisma.taskOrder.findUnique({
    where: { id },
    include: { guide: true, driver: true },
  });
  if (!order) return null;
  const trips = await loadTripSummaries([order.tripId]);
  return { ...order, tripInfo: (order.tripId && trips.get(order.tripId)) || null };
}

// وصف رحلة الأمر للقوائم: الرحلة المسجّلة، أو ما كُتب يدوياً.
// deleted=true فقط إن كان الأمر مربوطاً برحلة لم تعد موجودة.
export function taskOrderTripLabel(o: TaskOrderView): { text: string; deleted: boolean } {
  if (o.tripInfo) return { text: `${o.tripInfo.programName} — ${o.tripInfo.customerName}`, deleted: false };
  if (o.tripId) return { text: "رحلة محذوفة", deleted: true };
  return { text: manualTripText(readFields(o.fields)) ?? "—", deleted: false };
}
