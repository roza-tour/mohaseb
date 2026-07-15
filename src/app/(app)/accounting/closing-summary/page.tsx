import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Td, Button } from "@/components/ui";
import { formatCurrency } from "@/lib/format";

function startOfYear() {
  return new Date(new Date().getFullYear(), 0, 1);
}
function endOfYear() {
  return new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);
}

export default async function ClosingSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const from = params.from && typeof params.from === "string" ? new Date(params.from) : startOfYear();
  const to = params.to && typeof params.to === "string" ? new Date(`${params.to}T23:59:59`) : endOfYear();

  const [trips, transactions] = await Promise.all([
    prisma.trip.findMany({
      where: { startDate: { gte: from, lte: to } },
      include: { hotelBookings: true, flightBookings: true, otherBookings: true },
    }),
    prisma.transaction.findMany({ where: { date: { gte: from, lte: to } } }),
  ]);

  const tripRevenue = trips.reduce((s, t) => s + t.agreedPrice, 0);
  const tripCost = trips.reduce(
    (s, t) =>
      s +
      t.hotelBookings.reduce((a, b) => a + b.cost, 0) +
      t.flightBookings.reduce((a, b) => a + b.cost, 0) +
      t.otherBookings.reduce((a, b) => a + b.cost, 0),
    0
  );
  const incomeTx = transactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const expenseTx = transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  const totalRevenue = tripRevenue + incomeTx;
  const totalCost = tripCost + expenseTx;
  const netProfit = totalRevenue - totalCost;

  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        title="الميزانية الختامية المجملة"
        description="ملخص الإيرادات والمصروفات الإجمالي لفترة محددة"
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
        <Table>
          <tbody>
            <tr>
              <Td className="text-slate-500">إيرادات الرحلات (الأسعار المتفق عليها)</Td>
              <Td className="font-medium">{formatCurrency(tripRevenue)}</Td>
            </tr>
            <tr>
              <Td className="text-slate-500">إيرادات أخرى</Td>
              <Td className="font-medium">{formatCurrency(incomeTx)}</Td>
            </tr>
            <tr className="bg-slate-50">
              <Td className="font-bold text-slate-800">إجمالي الإيرادات</Td>
              <Td className="font-bold text-emerald-600">{formatCurrency(totalRevenue)}</Td>
            </tr>
            <tr>
              <Td className="text-slate-500">تكاليف الحجوزات (فنادق، طيران، أخرى)</Td>
              <Td className="font-medium">{formatCurrency(tripCost)}</Td>
            </tr>
            <tr>
              <Td className="text-slate-500">مصروفات أخرى</Td>
              <Td className="font-medium">{formatCurrency(expenseTx)}</Td>
            </tr>
            <tr className="bg-slate-50">
              <Td className="font-bold text-slate-800">إجمالي التكاليف</Td>
              <Td className="font-bold text-red-600">{formatCurrency(totalCost)}</Td>
            </tr>
            <tr>
              <Td className="font-bold text-slate-800 text-base">صافي الربح / الخسارة</Td>
              <Td className={`font-bold text-base ${netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {formatCurrency(netProfit)}
              </Td>
            </tr>
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
