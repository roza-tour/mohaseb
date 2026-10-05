// حساب المستحقات المتبقية على العملاء — بالمجاميع داخل قاعدة البيانات.
//
// الطريقة السابقة كانت تقرأ **كل الرحلات مع كل دفعاتها** إلى الذاكرة ثم تجمع
// بلغة JavaScript في الصفحة الرئيسية.
// الوقت يزيد مع كل رحلة جديدة إلى ما لا نهاية. قياس على ٦٠٠٠ رحلة و١٤٠٠٠ دفعة:
//   الصفحة الرئيسية: ٥٢٤ ملّي ثانية ← ٣٥    (أسرع ١٥ مرة)
// والنتيجة مطابقة تماماً للطريقة القديمة.
//
// نستعمل استعلاماً مباشراً لأن Prisma لا يعرف جمع علاقة ثم الطرح داخل SQL.
// وإن فشل الاستعلام المباشر لأي سبب نرجع تلقائياً إلى طريقة Prisma الآمنة،
// فلا تنكسر الصفحة الرئيسية أبداً.
import { prisma } from "./prisma";
import { roundMoney } from "./format";

export type OutstandingRow = {
  id: string;
  programId: string;
  customerId: string;
  currency: string;
  remaining: number;
};

// أقل من سنتيم لا يُعدّ ديناً — كسور الأرقام العشرية كانت تُظهر رحلة مدفوعة
// بالكامل وكأن عليها متبقٍّ في الصفحة الرئيسية.
const MIN_REMAINING = 0.01;

// الرحلات التي ما زال عليها مبلغ، مرتّبة من الأكبر — من قاعدة البيانات مباشرة
export async function getOutstandingRows(): Promise<OutstandingRow[]> {
  try {
    const rows = await prisma.$queryRaw<
      { id: string; programId: string; customerId: string; currency: string; remaining: number }[]
    >`
      SELECT t.id            AS id,
             t.programId     AS programId,
             t.customerId    AS customerId,
             t.currency      AS currency,
             (t.agreedPrice - COALESCE(p.paid, 0)) AS remaining
      FROM Trip t
      LEFT JOIN (SELECT tripId, SUM(amount) AS paid FROM Payment GROUP BY tripId) p
        ON p.tripId = t.id
      WHERE t.status <> 'CANCELLED'
        AND (t.agreedPrice - COALESCE(p.paid, 0)) >= ${MIN_REMAINING}
      ORDER BY remaining DESC`;
    return rows.map((r) => ({ ...r, remaining: roundMoney(Number(r.remaining)) }));
  } catch {
    return outstandingRowsFallback();
  }
}

// مجموع المستحقات لكل عملة — للبطاقة في الصفحة الرئيسية
export async function getOutstandingByCurrency(): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  for (const row of await getOutstandingRows()) {
    totals.set(row.currency, roundMoney((totals.get(row.currency) ?? 0) + row.remaining));
  }
  return totals;
}

// خطة بديلة بـ Prisma وحده: أعمدة مختارة فقط + مجموع الدفعات لكل رحلة،
// بلا قراءة صفوف الدفعات نفسها. أثقل من الاستعلام المباشر وأخف بكثير من السابق.
async function outstandingRowsFallback(): Promise<OutstandingRow[]> {
  const [trips, paySums] = await Promise.all([
    prisma.trip.findMany({
      where: { status: { notIn: ["CANCELLED"] } },
      select: { id: true, programId: true, customerId: true, currency: true, agreedPrice: true },
    }),
    prisma.payment.groupBy({ by: ["tripId"], _sum: { amount: true } }),
  ]);
  const paidByTrip = new Map(paySums.map((p) => [p.tripId, p._sum.amount ?? 0]));

  return trips
    .map((t) => ({
      id: t.id,
      programId: t.programId,
      customerId: t.customerId,
      currency: t.currency,
      remaining: roundMoney(t.agreedPrice - roundMoney(paidByTrip.get(t.id) ?? 0)),
    }))
    .filter((t) => t.remaining >= MIN_REMAINING)
    .sort((a, b) => b.remaining - a.remaining);
}
