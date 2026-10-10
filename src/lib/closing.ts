// حسابات الميزانيتين الختاميتين (المجملة والمفصلة) — بالمجاميع داخل قاعدة البيانات.
//
// كانت الصفحتان تقرآن كل رحلات الفترة صفاً صفاً مع كل حجوزات فنادقها وطيرانها
// وغيرها، وكل قيود الفترة، ثم تجمع في الذاكرة — والمفصلة تمرّ على كل القيود
// مرةً لكل (برنامج، عملة). الوقت يكبر مع البيانات: على 6000 رحلة كانت
// المجملة 408 ملّي ثانية والمفصلة 271. هنا تجمع قاعدة البيانات، ولا نقرأ من
// الرحلة إلا أعمدتها الأربعة اللازمة، والنتيجة مطابقة رقماً برقم.
import { prisma } from "./prisma";

export type ClosingTrip = {
  id: string;
  programId: string;
  currency: string;
  agreedPrice: number;
  bookingCost: number; // فنادق + طيران + حجوزات أخرى
};

type Range = { gte: Date; lte: Date };

// رحلات الفترة (حسب تاريخ بدايتها) مع مجموع تكلفة حجوزاتها
export async function closingTrips(range: Range): Promise<ClosingTrip[]> {
  const inRange = { startDate: range };
  const [trips, hotel, flight, other] = await Promise.all([
    prisma.trip.findMany({
      where: inRange,
      select: { id: true, programId: true, currency: true, agreedPrice: true },
    }),
    prisma.hotelBooking.groupBy({ by: ["tripId"], where: { trip: inRange }, _sum: { cost: true } }),
    prisma.flightBooking.groupBy({ by: ["tripId"], where: { trip: inRange }, _sum: { cost: true } }),
    prisma.otherBooking.groupBy({ by: ["tripId"], where: { trip: inRange }, _sum: { cost: true } }),
  ]);
  const cost = new Map<string, number>();
  for (const g of [...hotel, ...flight, ...other]) {
    cost.set(g.tripId, (cost.get(g.tripId) ?? 0) + (g._sum.cost ?? 0));
  }
  return trips.map((t) => ({ ...t, bookingCost: cost.get(t.id) ?? 0 }));
}

// المحصَّل من العملاء في الفترة مجمّعاً بعملة رحلته.
// استعلام واحد بدل قراءة كل الدفعات ثم البحث عن عملة كل رحلة (176 ← 29 ملّي ثانية
// على 14000 دفعة). وإن فشل الاستعلام المباشر نرجع لطريقة Prisma الآمنة.
// دفعة رحلتها محذوفة لا تُحسب ولا تُسقط التقرير.
async function collectedByCurrency(range: Range): Promise<Map<string, number>> {
  try {
    const rows = await prisma.$queryRaw<{ currency: string; total: number }[]>`
      SELECT t.currency AS currency, SUM(p.amount) AS total
      FROM Payment p
      JOIN Trip t ON t.id = p.tripId
      WHERE p.paidAt >= ${range.gte} AND p.paidAt <= ${range.lte}
      GROUP BY t.currency`;
    return new Map(rows.map((r) => [r.currency, Number(r.total)]));
  } catch {
    const sums = await prisma.payment.groupBy({ by: ["tripId"], where: { paidAt: range }, _sum: { amount: true } });
    const trips = sums.length
      ? await prisma.trip.findMany({ where: { id: { in: sums.map((p) => p.tripId) } }, select: { id: true, currency: true } })
      : [];
    const currencyOf = new Map(trips.map((t) => [t.id, t.currency]));
    const out = new Map<string, number>();
    for (const p of sums) {
      const c = currencyOf.get(p.tripId);
      if (c) out.set(c, (out.get(c) ?? 0) + (p._sum.amount ?? 0));
    }
    return out;
  }
}

export type CurrencyTotals = {
  tripRevenue: number;
  tripCost: number;
  incomeTx: number;
  expenseTx: number;
  collected: number;
};

// الميزانية المجملة: مجاميع لكل عملة
export async function closingSummary(range: Range): Promise<Map<string, CurrencyTotals>> {
  const [trips, txByType, otherIncome, collected] = await Promise.all([
    closingTrips(range),
    // كل قيود الفترة مجمّعة حسب العملة والنوع
    prisma.transaction.groupBy({ by: ["currency", "type"], where: { date: range }, _sum: { amount: true } }),
    // الإيراد غير المرتبط برحلة وحده يُضاف (المرتبط تحصيل من سعر الرحلة المحسوب أصلاً)
    prisma.transaction.groupBy({
      by: ["currency"],
      where: { date: range, type: "INCOME", tripId: null },
      _sum: { amount: true },
    }),
    // المحصَّل فعلاً من العملاء خلال الفترة (أساس نقدي — للعلم فقط)
    collectedByCurrency(range),
  ]);

  const byCurrency = new Map<string, CurrencyTotals>();
  const get = (c: string) => {
    let b = byCurrency.get(c);
    if (!b) {
      b = { tripRevenue: 0, tripCost: 0, incomeTx: 0, expenseTx: 0, collected: 0 };
      byCurrency.set(c, b);
    }
    return b;
  };

  for (const t of trips) {
    const b = get(t.currency);
    b.tripRevenue += t.agreedPrice;
    b.tripCost += t.bookingCost;
  }
  for (const g of txByType) {
    const b = get(g.currency); // كل عملة لها قيد في الفترة تظهر، ولو كان إيراداً مرتبطاً برحلة
    if (g.type !== "INCOME") b.expenseTx += g._sum.amount ?? 0;
  }
  for (const g of otherIncome) get(g.currency).incomeTx += g._sum.amount ?? 0;
  for (const [c, amount] of collected) get(c).collected += amount;
  return byCurrency;
}

export type DetailedRow = {
  program: { id: string; name: string };
  currency: string;
  tripCount: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number;
};

// الميزانية المفصلة: صف لكل (برنامج، عملة)، مرتّب بالربح
export async function closingDetailed(range: Range): Promise<DetailedRow[]> {
  const trips = await closingTrips(range);
  const programs = trips.length
    ? await prisma.tourProgram.findMany({
        where: { id: { in: [...new Set(trips.map((t) => t.programId))] } },
        select: { id: true, name: true },
      })
    : [];
  const programIds = new Set(programs.map((p) => p.id));
  // رحلة برنامجها محذوف لا تدخل التقرير (كما كان)
  const kept = trips.filter((t) => programIds.has(t.programId));
  const programOf = new Map(kept.map((t) => [t.id, t.programId]));

  // القيود المرتبطة برحلات الفترة، داخل الفترة نفسها، مجمّعة
  const txGroups = kept.length
    ? await prisma.transaction.groupBy({
        by: ["tripId", "currency", "type"],
        where: { trip: { startDate: range }, date: range },
        _sum: { amount: true },
      })
    : [];

  const rows: DetailedRow[] = [];
  for (const p of programs) {
    const pTrips = kept.filter((t) => t.programId === p.id);
    const pTx = txGroups.filter((g) => g.tripId && programOf.get(g.tripId) === p.id);
    // العملات = عملات الرحلات + عملات القيود المرتبطة بها (قد يُسجَّل مصروف بعملة أخرى)
    const currencies = [...new Set([...pTrips.map((t) => t.currency), ...pTx.map((g) => g.currency)])];
    for (const currency of currencies) {
      const cTrips = pTrips.filter((t) => t.currency === currency);
      const revenue = cTrips.reduce((s, t) => s + t.agreedPrice, 0);
      const bookingCost = cTrips.reduce((s, t) => s + t.bookingCost, 0);
      // قيود الإيراد المرتبطة برحلة لا تُضاف: هي تحصيل من السعر المتفق عليه
      const txExpense = pTx
        .filter((g) => g.type === "EXPENSE" && g.currency === currency)
        .reduce((s, g) => s + (g._sum.amount ?? 0), 0);
      const cost = bookingCost + txExpense;
      const profit = revenue - cost;
      rows.push({
        program: p,
        currency,
        tripCount: cTrips.length,
        revenue,
        cost,
        profit,
        marginPct: revenue > 0 ? (profit / revenue) * 100 : 0,
      });
    }
  }
  return rows.sort((a, b) => b.profit - a.profit);
}
