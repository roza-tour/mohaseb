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
  const from = params.from && typeof params.from === "string" ? new Date(params.from) : startOfYear();
  const to = params.to && typeof params.to === "string" ? new Date(`${params.to}T23:59:59`) : endOfYear();

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

  const linkedTransactions = allTripIds.length
    ? await prisma.transaction.findMany({ where: { tripId: { in: allTripIds } } })
    : [];

  const rows = relevantPrograms
    .map((p) => {
      const tripIds = p.trips.map((t) => t.id);
      const tripAgreedRevenue = p.trips.reduce((s, t) => s + t.agreedPrice, 0);
      const bookingCost = p.trips.reduce(
        (s, t) =>
          s +
          t.hotelBookings.reduce((a, b) => a + b.cost, 0) +
          t.flightBookings.reduce((a, b) => a + b.cost, 0) +
          t.otherBookings.reduce((a, b) => a + b.cost, 0),
        0
      );
      const txIncome = linkedTransactions
        .filter((tx) => tx.tripId && tripIds.includes(tx.tripId) && tx.type === "INCOME")
        .reduce((s, tx) => s + tx.amount, 0);
      const txExpense = linkedTransactions
        .filter((tx) => tx.tripId && tripIds.includes(tx.tripId) && tx.type === "EXPENSE")
        .reduce((s, tx) => s + tx.amount, 0);

      const revenue = tripAgreedRevenue + txIncome;
      const cost = bookingCost + txExpense;
      const profit = revenue - cost;
      const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

      return { program: p, tripCount: p.trips.length, revenue, cost, profit, marginPct };
    })
    .sort((a, b) => b.profit - a.profit);

  const totals = rows.reduce(
    (acc, r) => ({
      tripCount: acc.tripCount + r.tripCount,
      revenue: acc.revenue + r.revenue,
      cost: acc.cost + r.cost,
      profit: acc.profit + r.profit,
    }),
    { tripCount: 0, revenue: 0, cost: 0, profit: 0 }
  );

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
                <tr key={r.program.id}>
                  <Td className="font-medium text-slate-800">{r.program.name}</Td>
                  <Td>{r.tripCount}</Td>
                  <Td>{formatCurrency(r.revenue)}</Td>
                  <Td>{formatCurrency(r.cost)}</Td>
                  <Td>
                    <Badge color={r.profit >= 0 ? "green" : "red"}>{formatCurrency(r.profit)}</Badge>
                  </Td>
                  <Td>{r.marginPct.toFixed(1)}%</Td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold">
                <Td>الإجمالي</Td>
                <Td>{totals.tripCount}</Td>
                <Td>{formatCurrency(totals.revenue)}</Td>
                <Td>{formatCurrency(totals.cost)}</Td>
                <Td className={totals.profit >= 0 ? "text-emerald-600" : "text-red-600"}>
                  {formatCurrency(totals.profit)}
                </Td>
                <Td>—</Td>
              </tr>
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
