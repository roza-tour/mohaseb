import { PageHeader, Card, Table, Th, Td, Button, Badge, EmptyState } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { closingDetailed } from "@/lib/closing";

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

  // صف لكل (برنامج، عملة) مرتّب بالربح — المجاميع داخل قاعدة البيانات (src/lib/closing.ts)
  const rows = await closingDetailed({ gte: from, lte: to });

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
