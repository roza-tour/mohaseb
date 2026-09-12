// حذف الرحلات وأوامر التكليف — يدوياً أو تلقائياً بعد انتهائها.
//
// حذف الرحلة يحذف معها (بقيد قاعدة البيانات) حجوزاتها وأوامر تكليفها ومرفقاتها
// و**سندات القبض** الصادرة لعميلها. حتى لا يختفي مال محصَّل من الحسابات، نسجّل قبل
// الحذف قيد إيراد واحداً بمجموع ما دُفع فعلاً، فيبقى المبلغ في الميزانية والقيود
// المحاسبية بعد اختفاء الرحلة. العملاء والفواتير والمستندات الصادرة لا تُحذف.
import fs from "fs";
import path from "path";
import { prisma } from "./prisma";
import { formatDate } from "./format";

export type CleanupCounts = { trips: number; taskOrders: number };

// تاريخ الحدّ: كل ما انتهى قبله يدخل في التنظيف
export function cleanupCutoff(daysAfter: number): Date {
  const cutoff = new Date();
  cutoff.setUTCHours(0, 0, 0, 0);
  cutoff.setUTCDate(cutoff.getUTCDate() - Math.max(0, daysAfter));
  return cutoff;
}

// حذف ملفات المرفقات من القرص (سجلاتها تُحذف مع الرحلة تلقائياً)
async function removeAttachmentFiles(paths: string[]) {
  for (const p of paths) {
    const disk = p.startsWith("/")
      ? path.join(process.cwd(), "public", p.replace(/^\//, ""))
      : path.join(process.cwd(), "private_uploads", "attachments", p);
    try {
      await fs.promises.unlink(disk);
    } catch {
      // الملف غير موجود — لا شيء نفعله
    }
  }
}

// حذف رحلة مع الحفاظ على أثرها المالي. تُعيد وصفاً مختصراً للسجل في سجل النشاط.
export async function deleteTripPreservingMoney(tripId: string): Promise<string | null> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { program: true, customer: true, payments: true, attachments: true },
  });
  if (!trip) return null;

  const collected = trip.payments.reduce((sum, p) => sum + p.amount, 0);
  const label = `${trip.program.name} — ${trip.customer.name} (${formatDate(trip.startDate)})`;

  if (collected > 0) {
    const receipts = trip.payments.map((p) => p.receiptNumber).join("، ");
    const lastPaidAt = trip.payments.reduce(
      (latest, p) => (p.paidAt > latest ? p.paidAt : latest),
      trip.payments[0].paidAt
    );
    await prisma.transaction.create({
      data: {
        type: "INCOME",
        category: "تحصيل رحلة محذوفة",
        amount: collected,
        currency: trip.currency,
        date: lastPaidAt,
        description: `المبلغ المحصَّل من رحلة ${label} — سندات القبض: ${receipts}`,
      },
    });
  }

  await removeAttachmentFiles(trip.attachments.map((a) => a.path));
  await prisma.trip.delete({ where: { id: tripId } });
  return label;
}

// عدد ما سيُحذف لو شُغِّل التنظيف الآن — للعرض في الإعدادات قبل التفعيل
export async function previewCleanup(daysAfter: number): Promise<CleanupCounts> {
  const cutoff = cleanupCutoff(daysAfter);
  const [trips, taskOrders] = await Promise.all([
    prisma.trip.count({ where: { endDate: { lt: cutoff } } }),
    prisma.taskOrder.count({ where: { taskDate: { lt: cutoff } } }),
  ]);
  return { trips, taskOrders };
}

// التنظيف الفعلي: الرحلات التي مضى على انتهائها المدة المحددة، وأوامر التكليف
// التي مضى على تاريخ مهمتها نفس المدة. أوامر تكليف الرحلات المحذوفة تُحذف معها.
export async function runCleanup(daysAfter: number): Promise<CleanupCounts> {
  const cutoff = cleanupCutoff(daysAfter);

  const oldTrips = await prisma.trip.findMany({
    where: { endDate: { lt: cutoff } },
    select: { id: true },
  });
  let trips = 0;
  for (const t of oldTrips) {
    if (await deleteTripPreservingMoney(t.id)) trips += 1;
  }

  const { count: taskOrders } = await prisma.taskOrder.deleteMany({
    where: { taskDate: { lt: cutoff } },
  });

  await prisma.settings.update({ where: { id: 1 }, data: { lastCleanupAt: new Date() } }).catch(() => {});
  return { trips, taskOrders };
}
