import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Td, Button } from "@/components/ui";
import { formatCurrency } from "@/lib/format";

function startOfYear() {
  return new Date(new Date().getFullYear(), 0, 1);
}
function endOfYear() {
  return new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);
}

type CurrencyTotals = {
  tripRevenue: number;
  tripCost: number;
  incomeTx: number;
  expenseTx: number;
  collected: number;
};

export default async function ClosingSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const fromRaw = params.from && typeof params.from === "string" ? new Date(params.from) : startOfYear();
  const toRaw = params.to && typeof params.to === "string" ? new Date(`${params.to}T23:59:59`) : endOfYear();
  const from = isNaN(fromRaw.getTime()) ? startOfYear() : fromRaw;
  const to = isNaN(toRaw.getTime()) ? endOfYear() : toRaw;

  const [trips, transactions, payments] = await Promise.all([
    prisma.trip.findMany({
      where: { startDate: { gte: from, lte: to } },
      include: { hotelBookings: true, flightBookings: true, otherBookings: true },
    }),
    prisma.transaction.findMany({ where: { date: { gte: from, lte: to } } }),
    // المحصَّل فعلاً من العملاء خلال الفترة (أساس نقدي — يُعرض للعلم ولا يُجمع مع الإيراد)
    prisma.payment.findMany({
      where: { paidAt: { gte: from, lte: to } },
      include: { trip: { select: { currency: true } } },
    }),
  ]);

  // فصل المجاميع حسب العملة حتى لا تُجمع مبالغ بعملات مختلفة كرقم واحد
  const byCurrency = new Map<string, CurrencyTotals>();
  const get = (c: string) => {
    if (!byCurrency.has(c))
      byCurrency.set(c, { tripRevenue: 0, tripCost: 0, incomeTx: 0, expenseTx: 0, collected: 0 });
    return byCurrency.get(c)!;
  };

  for (const t of trips) {
    const bucket = get(t.currency);
    bucket.tripRevenue += t.agreedPrice;
    bucket.tripCost +=
      t.hotelBookings.reduce((a, b) => a + b.cost, 0) +
      t.flightBookings.reduce((a, b) => a + b.cost, 0) +
      t.otherBookings.reduce((a, b) => a + b.cost, 0);
  }
  for (const tx of transactions) {
    const bucket = get(tx.currency);
    // قيود الإيراد المرتبطة برحلة = تحصيل من سعرها المتفق عليه، لا إيراد إضافي.
    // جمعها مع سعر الرحلة كان يضاعف الإيراد لمن يسجّل دفعات العملاء كقيود.
    if (tx.type === "INCOME") {
      if (!tx.tripId) bucket.incomeTx += tx.amount;
    } else {
      bucket.expenseTx += tx.amount;
    }
  }
  for (const p of payments) {
    get(p.trip.currency).collected += p.amount;
  }

  const currencies = [...byCurrency.keys()].sort();
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        title="الميزانية الختامية المجملة"
        description="ملخص الإيرادات والمصروفات الإجمالي لفترة محددة — مفصولاً حسب العملة"
      />

      <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 max-w-3xl">
        الربح محسوب على <b>أساس الاستحقاق</b>: إيراد الرحلة هو سعرها المتفق عليه كاملاً سواء حُصِّل أم لا.
        لذلك لا تُضاف قيود الإيراد المرتبطة برحلة (فهي تحصيل من نفس السعر)، بينما تُضاف القيود غير المرتبطة
        برحلة كإيرادات أخرى. أما المبلغ المحصَّل فعلاً فيظهر في آخر سطر للعلم فقط.
      </div>

      <Card className="p-5 mb-6">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">من تاريخ</label>
            <input
              type="date"
              name="from"
              defaultValue={fromStr}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">إلى تاريخ</label>
            <input
              type="date"
              name="to"
              defaultValue={toStr}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <Button type="submit" variant="secondary">
            تطبيق
          </Button>
        </form>
      </Card>

      {currencies.length === 0 ? (
        <Card className="p-5">
          <p className="text-center text-sm text-slate-400 py-8">لا توجد بيانات ضمن هذه الفترة</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {currencies.map((currency) => {
            const t = byCurrency.get(currency)!;
            const totalRevenue = t.tripRevenue + t.incomeTx;
            const totalCost = t.tripCost + t.expenseTx;
            const netProfit = totalRevenue - totalCost;
            return (
              <Card key={currency}>
                {currencies.length > 1 && (
                  <p className="px-4 pt-4 text-sm font-bold text-slate-700">العملة: {currency}</p>
                )}
                <Table>
                  <tbody>
                    <tr>
                      <Td className="text-slate-500">إيرادات الرحلات (الأسعار المتفق عليها)</Td>
                      <Td className="font-medium">{formatCurrency(t.tripRevenue, currency)}</Td>
                    </tr>
                    <tr>
                      <Td className="text-slate-500">إيرادات أخرى (قيود غير مرتبطة برحلة)</Td>
                      <Td className="font-medium">{formatCurrency(t.incomeTx, currency)}</Td>
                    </tr>
                    <tr className="bg-slate-50">
                      <Td className="font-bold text-slate-800">إجمالي الإيرادات</Td>
                      <Td className="font-bold text-emerald-600">{formatCurrency(totalRevenue, currency)}</Td>
                    </tr>
                    <tr>
                      <Td className="text-slate-500">تكاليف الحجوزات (فنادق، طيران، أخرى)</Td>
                      <Td className="font-medium">{formatCurrency(t.tripCost, currency)}</Td>
                    </tr>
                    <tr>
                      <Td className="text-slate-500">مصروفات أخرى</Td>
                      <Td className="font-medium">{formatCurrency(t.expenseTx, currency)}</Td>
                    </tr>
                    <tr className="bg-slate-50">
                      <Td className="font-bold text-slate-800">إجمالي التكاليف</Td>
                      <Td className="font-bold text-red-600">{formatCurrency(totalCost, currency)}</Td>
                    </tr>
                    <tr>
                      <Td className="font-bold text-slate-800 text-base">صافي الربح / الخسارة</Td>
                      <Td className={`font-bold text-base ${netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {formatCurrency(netProfit, currency)}
                      </Td>
                    </tr>
                    <tr>
                      <Td className="text-slate-500">
                        المحصَّل فعلاً من العملاء خلال الفترة (سندات القبض)
                        <span className="block text-xs text-slate-400">
                          رقم نقدي للعلم — غير داخل في حساب الربح أعلاه
                        </span>
                      </Td>
                      <Td className="font-medium text-sky-700">{formatCurrency(t.collected, currency)}</Td>
                    </tr>
                  </tbody>
                </Table>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
