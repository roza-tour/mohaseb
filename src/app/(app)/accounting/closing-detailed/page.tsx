import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, Button, Badge, EmptyState } from "@/components/ui";
import { formatCurrency } from "@/lib/format";

function startOfYear() {
  return new Date(new Date().getFullYear(), 0, 1);
}
function endOfYear() {
  return new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);
}

export default async function ClosingDetailedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const fromRaw = params.from && typeof params.from === "string" ? new Date(params.from) : startOfYear();
  const toRaw = params.to && typeof params.to === "string" ? new Date(`${params.to}T23:59:59`) : endOfYear();
  const from = isNaN(fromRaw.getTime()) ? startOfYear() : fromRaw;
  const to = isNaN(toRaw.getTime()) ? endOfYear() : toRaw;

  const programs = await prisma.tourProgram.findMany({
    include: {
      trips: {
        where: { startDate: { gte: from, lte: to } },
        include: { hotelBookings: true, flightBookings: true, otherBookings: true },
      },
    },
  });

  const relevantPrograms = programs.filter((p) => p.trips.length > 0);
  const allTripIds = relevantPrograms.flatMap((p) => p.trips.map((t) => t.id));

  // نفلتر القيود بنفس فترة التقرير حتى يتطابق مع الميزانية المجملة
  const linkedTransactions = allTripIds.length
    ? await prisma.transaction.findMany({
        where: { tripId: { in: allTripIds }, date: { gte: from, lte: to } },
      })
    : [];

  // صف لكل (برنامج، عملة) حتى لا تُجمع مبالغ بعملات مختلفة كرقم واحد
  const rows = relevantPrograms
    .flatMap((p) => {
      const pTripIds = new Set(p.trips.map((t) => t.id));
      // العملات = عملات الرحلات + عملات القيود المرتبطة بها (قد يُسجَّل مصروف بعملة مختلفة عن الرحلة)
      const pTxCurrencies = linkedTransactions
        .filter((tx) => tx.tripId && pTripIds.has(tx.tripId))
        .map((tx) => tx.currency);
      const currencies = [...new Set([...p.trips.map((t) => t.currency), ...pTxCurrencies])];
      return currencies.map((currency) => {
        const trips = p.trips.filter((t) => t.currency === currency);
        const tripAgreedRevenue = trips.reduce((s, t) => s + t.agreedPrice, 0);
        const bookingCost = trips.reduce(
          (s, t) =>
            s +
            t.hotelBookings.reduce((a, b) => a + b.cost, 0) +
            t.flightBookings.reduce((a, b) => a + b.cost, 0) +
            t.otherBookings.reduce((a, b) => a + b.cost, 0),
          0
        );
        // القيود تُنسب للبرنامج (كل رحلاته) وتُطابَق بالعملة — حتى لا يسقط مصروف بعملة مختلفة عن الرحلة.
        // قيود الإيراد المرتبطة برحلة لا تُضاف للإيراد: هي تحصيل من السعر المتفق عليه
        // المحسوب أصلاً، وجمعها معه كان يضاعف إيراد البرنامج.
        const txExpense = linkedTransactions
          .filter((tx) => tx.tripId && pTripIds.has(tx.tripId) && tx.type === "EXPENSE" && tx.currency === currency)
          .reduce((s, tx) => s + tx.amount, 0);

        const revenue = tripAgreedRevenue;
        const cost = bookingCost + txExpense;
        const profit = revenue - cost;
        const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

        return { program: p, currency, tripCount: trips.length, revenue, cost, profit, marginPct };
      });
    })
    .sort((a, b) => b.profit - a.profit);

  // إجمالي لكل عملة على حدة
  const totalsByCurrency = new Map<string, { tripCount: number; revenue: number; cost: number; profit: number }>();
  for (const r of rows) {
    const acc = totalsByCurrency.get(r.currency) ?? { tripCount: 0, revenue: 0, cost: 0, profit: 0 };
    acc.tripCount += r.tripCount;
    acc.revenue += r.revenue;
    acc.cost += r.cost;
    acc.profit += r.profit;
    totalsByCurrency.set(r.currency, acc);
  }

  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        title="الميزانية الختامية المفصلة"
        description="تفصيل الإيرادات والتكاليف وصافي الربح لكل برنامج سياحي على حدة"
      />

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

      <Card>
        {rows.length === 0 ? (
          <EmptyState message="لا توجد رحلات ضمن هذه الفترة" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>البرنامج</Th>
                <Th>عدد الرحلات</Th>
                <Th>الإيرادات</Th>
                <Th>التكاليف</Th>
                <Th>صافي الربح</Th>
                <Th>هامش الربح</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.program.id + r.currency}>
                  <Td className="font-medium text-slate-800">{r.program.name}</Td>
                  <Td>{r.tripCount}</Td>
                  <Td>{formatCurrency(r.revenue, r.currency)}</Td>
                  <Td>{formatCurrency(r.cost, r.currency)}</Td>
                  <Td>
                    <Badge color={r.profit >= 0 ? "green" : "red"}>{formatCurrency(r.profit, r.currency)}</Badge>
                  </Td>
                  <Td>{r.marginPct.toFixed(1)}%</Td>
                </tr>
              ))}
              {[...totalsByCurrency.entries()].map(([currency, t]) => (
                <tr key={currency} className="bg-slate-50 font-bold">
                  <Td>الإجمالي ({currency})</Td>
                  <Td>{t.tripCount}</Td>
                  <Td>{formatCurrency(t.revenue, currency)}</Td>
                  <Td>{formatCurrency(t.cost, currency)}</Td>
                  <Td className={t.profit >= 0 ? "text-emerald-600" : "text-red-600"}>
                    {formatCurrency(t.profit, currency)}
                  </Td>
                  <Td>—</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
