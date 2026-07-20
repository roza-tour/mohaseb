import { prisma } from "@/lib/prisma";
import { getUpcomingTrips } from "@/lib/reminders";
import { Card, PageHeader, Badge, EmptyState } from "@/components/ui";
import { formatDate, formatCurrency } from "@/lib/format";
import Link from "next/link";
import { MonthlyChart, type MonthPoint } from "@/components/MonthlyChart";

export default async function DashboardPage() {
  const [customersCount, activeTrips, upcoming, monthTransactions, settings, unpaidTrips] = await Promise.all([
    prisma.customer.count(),
    prisma.trip.count({ where: { status: { in: ["PLANNED", "CONFIRMED", "IN_PROGRESS"] } } }),
    getUpcomingTrips(),
    prisma.transaction.findMany({
      where: {
        date: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
    prisma.settings.findUnique({ where: { id: 1 } }),
    prisma.trip.findMany({
      where: { status: { notIn: ["CANCELLED"] } },
      include: { payments: true },
    }),
  ]);

  // بيانات رسم آخر ستة أشهر (بالعملة الافتراضية فقط)
  const sixMonthsAgo = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1);
  const chartTxs = await prisma.transaction.findMany({
    where: { date: { gte: sixMonthsAgo } },
    select: { type: true, amount: true, date: true, currency: true },
  });


  const currency = settings?.defaultCurrency ?? "DZD";
  // المستحقات المتبقية لدى العملاء، مفصولة حسب العملة
  const outstandingByCurrency = new Map<string, number>();
  for (const t of unpaidTrips) {
    const paid = t.payments.reduce((s, p) => s + p.amount, 0);
    const remaining = t.agreedPrice - paid;
    if (remaining > 0) {
      outstandingByCurrency.set(t.currency, (outstandingByCurrency.get(t.currency) ?? 0) + remaining);
    }
  }
  const outstandingText =
    outstandingByCurrency.size === 0
      ? formatCurrency(0, currency)
      : [...outstandingByCurrency.entries()].map(([c, v]) => formatCurrency(v, c)).join("  +  ");

  const chartData: MonthPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const monthTxs = chartTxs.filter(
      (t) => t.currency === currency && t.date >= d && t.date < next
    );
    chartData.push({
      label: `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`,
      income: monthTxs.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0),
      expense: monthTxs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0),
    });
  }
  const income = monthTransactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const expense = monthTransactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);

  const stats = [
    { label: "عدد العملاء", value: customersCount, href: "/customers" },
    { label: "رحلات نشطة", value: activeTrips, href: "/trips" },
    { label: "إيرادات الشهر", value: formatCurrency(income, currency), href: "/accounting/transactions" },
    { label: "مصروفات الشهر", value: formatCurrency(expense, currency), href: "/accounting/transactions" },
    { label: "مستحقات متبقية لدى العملاء", value: outstandingText, href: "/trips" },
  ];

  return (
    <div>
      <PageHeader title="لوحة التحكم" description="نظرة عامة على أعمال الوكالة" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="p-5 hover:shadow-md transition">
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className="text-lg font-bold text-slate-800">{s.value}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="p-5 mb-6">
        <h2 className="font-bold text-slate-800 mb-3">📈 الإيرادات والمصروفات — آخر ستة أشهر (من القيود المحاسبية)</h2>
        <MonthlyChart data={chartData} currency={currency} />
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-800">🔔 رحلات قادمة قريباً</h2>
          <Link href="/trips" className="text-sm text-sky-600 hover:underline">
            عرض كل الرحلات
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState message="لا توجد رحلات خلال الفترة القادمة" />
        ) : (
          <div className="divide-y divide-slate-100">
            {upcoming.map((t) => (
              <Link
                key={t.id}
                href={`/trips/${t.id}`}
                className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{t.programName}</p>
                  <p className="text-xs text-slate-500">{t.customerName}</p>
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-500">{formatDate(t.startDate)}</p>
                  <Badge color={t.daysRemaining <= 1 ? "red" : t.daysRemaining <= 3 ? "amber" : "sky"}>
                    {t.daysRemaining <= 0 ? "يبدأ اليوم" : `خلال ${t.daysRemaining} يوم`}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
