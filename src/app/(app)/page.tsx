import { prisma } from "@/lib/prisma";
import { getUpcomingTrips } from "@/lib/reminders";
import { Card, PageHeader, Badge, EmptyState } from "@/components/ui";
import { formatDate, formatCurrency } from "@/lib/format";
import Link from "next/link";
import { MonthlyChart, type MonthPoint } from "@/components/MonthlyChart";
import { SendReminderButton } from "@/components/SendReminderButton";

export default async function DashboardPage() {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [customersCount, activeTrips, upcoming, monthTransactions, settings, unpaidTrips, invitationsMonth, visasMonth] =
    await Promise.all([
      prisma.customer.count(),
      prisma.trip.count({ where: { status: { in: ["PLANNED", "CONFIRMED", "IN_PROGRESS"] } } }),
      getUpcomingTrips(),
      prisma.transaction.findMany({ where: { date: { gte: monthStart } } }),
      prisma.settings.findUnique({ where: { id: 1 } }),
      prisma.trip.findMany({
        where: { status: { notIn: ["CANCELLED"] } },
        include: { payments: true },
      }),
      prisma.invitation.count({ where: { docDate: { gte: monthStart } } }),
      prisma.visaApplication.count({ where: { createdAt: { gte: monthStart } } }),
    ]);

  // أكثر البرامج طلباً (حسب عدد الرحلات)
  const topProgramsRaw = await prisma.trip.groupBy({
    by: ["programId"],
    _count: { programId: true },
    orderBy: { _count: { programId: "desc" } },
    take: 5,
  });
  const topProgramNames = await prisma.tourProgram.findMany({
    where: { id: { in: topProgramsRaw.map((t) => t.programId) } },
    select: { id: true, name: true },
  });
  const topPrograms = topProgramsRaw.map((t) => ({
    name: topProgramNames.find((p) => p.id === t.programId)?.name ?? "—",
    count: t._count.programId,
  }));

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
  // إيرادات ومصروفات الشهر مفصولة حسب العملة حتى لا تُجمع عملات مختلفة في رقم واحد
  const monthIncomeByCurrency = new Map<string, number>();
  const monthExpenseByCurrency = new Map<string, number>();
  for (const t of monthTransactions) {
    const target =
      t.type === "INCOME" ? monthIncomeByCurrency : t.type === "EXPENSE" ? monthExpenseByCurrency : null;
    if (target) target.set(t.currency, (target.get(t.currency) ?? 0) + t.amount);
  }
  const perCurrencyText = (m: Map<string, number>) =>
    m.size === 0
      ? formatCurrency(0, currency)
      : [...m.entries()].map(([c, v]) => formatCurrency(v, c)).join("  +  ");
  const incomeText = perCurrencyText(monthIncomeByCurrency);
  const expenseText = perCurrencyText(monthExpenseByCurrency);

  // إيراد الخدمات (الدعوات + الفيزا) هذا الشهر، مفصولاً حسب العملة
  const SERVICE_CATS = ["خدمة دعوة", "خدمة فيزا صحراوية"];
  const serviceRevByCurrency = new Map<string, number>();
  for (const t of monthTransactions) {
    if (t.type === "INCOME" && SERVICE_CATS.includes(t.category)) {
      serviceRevByCurrency.set(t.currency, (serviceRevByCurrency.get(t.currency) ?? 0) + t.amount);
    }
  }
  const serviceRevText = perCurrencyText(serviceRevByCurrency);

  const stats = [
    { label: "عدد العملاء", value: customersCount, href: "/customers" },
    { label: "رحلات نشطة", value: activeTrips, href: "/trips" },
    { label: "إيرادات الشهر", value: incomeText, href: "/accounting/transactions" },
    { label: "مصروفات الشهر", value: expenseText, href: "/accounting/transactions" },
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
        <h2 className="font-bold text-slate-800 mb-4">💼 إيرادات الخدمات هذا الشهر (الدعوات والفيزا)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/invitations">
            <div className="rounded-lg border border-slate-200 p-4 hover:shadow-md transition">
              <p className="text-xs text-slate-500 mb-1">✉️ دعوات صدرت هذا الشهر</p>
              <p className="text-2xl font-bold text-slate-800">{invitationsMonth}</p>
            </div>
          </Link>
          <Link href="/visa">
            <div className="rounded-lg border border-slate-200 p-4 hover:shadow-md transition">
              <p className="text-xs text-slate-500 mb-1">🛂 ملفات فيزا هذا الشهر</p>
              <p className="text-2xl font-bold text-slate-800">{visasMonth}</p>
            </div>
          </Link>
          <Link href="/accounting/transactions">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 hover:shadow-md transition">
              <p className="text-xs text-emerald-700 mb-1">💵 إجمالي إيراد الخدمات</p>
              <p className="text-lg font-bold text-emerald-700">{serviceRevText}</p>
            </div>
          </Link>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-bold text-slate-800 mb-3">📈 الإيرادات والمصروفات — آخر ستة أشهر (من القيود المحاسبية)</h2>
          <MonthlyChart data={chartData} currency={currency} />
        </Card>
        <Card className="p-5">
          <h2 className="font-bold text-slate-800 mb-3">🏆 أكثر البرامج طلباً</h2>
          {topPrograms.length === 0 ? (
            <EmptyState message="لا توجد رحلات بعد" />
          ) : (
            <div className="space-y-2">
              {topPrograms.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 truncate ml-2">{i + 1}. {p.name}</span>
                  <Badge color="sky">{p.count} رحلة</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-bold text-slate-800">🔔 رحلات قادمة قريباً</h2>
          <div className="flex items-center gap-3">
            <SendReminderButton />
            <Link href="/trips" className="text-sm text-sky-600 hover:underline">
              عرض كل الرحلات
            </Link>
          </div>
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
