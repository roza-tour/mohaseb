import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/format";

const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

// جدول الثلاثين يوماً القادمة: أوامر التكليف والرحلات التي تبدأ في كل يوم،
// لرؤية أشغال المرشدين والسائقين وتفادي التعارضات
export default async function SchedulePage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 30);

  const [taskOrders, startingTrips] = await Promise.all([
    prisma.taskOrder.findMany({
      where: { taskDate: { gte: today, lt: horizon } },
      include: { trip: { include: { program: true, customer: true } }, guide: true, driver: true },
      orderBy: { taskDate: "asc" },
    }),
    prisma.trip.findMany({
      where: { startDate: { gte: today, lt: horizon }, status: { notIn: ["CANCELLED"] } },
      include: { program: true, customer: true },
      orderBy: { startDate: "asc" },
    }),
  ]);

  // تجميع باليوم
  type DayEntry = {
    date: Date;
    orders: typeof taskOrders;
    trips: typeof startingTrips;
  };
  const days = new Map<string, DayEntry>();
  const keyOf = (d: Date) => d.toISOString().slice(0, 10);
  for (const to of taskOrders) {
    const k = keyOf(to.taskDate);
    if (!days.has(k)) days.set(k, { date: to.taskDate, orders: [], trips: [] });
    days.get(k)!.orders.push(to);
  }
  for (const t of startingTrips) {
    const k = keyOf(t.startDate);
    if (!days.has(k)) days.set(k, { date: t.startDate, orders: [], trips: [] });
    days.get(k)!.trips.push(t);
  }
  const sorted = [...days.values()].sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div>
      <PageHeader
        title="جدول المهام"
        description="أوامر التكليف والرحلات التي تبدأ خلال الثلاثين يوماً القادمة، يوماً بيوم — لمتابعة أشغال المرشدين والسائقين"
      />

      {sorted.length === 0 ? (
        <Card>
          <EmptyState message="لا توجد مهام أو رحلات خلال الثلاثين يوماً القادمة" />
        </Card>
      ) : (
        <div className="space-y-4">
          {sorted.map((day) => (
            <Card key={keyOf(day.date)} className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="font-bold text-slate-800">
                  {DAY_NAMES[day.date.getDay()]} {formatDate(day.date)}
                </h2>
                {keyOf(day.date) === keyOf(new Date()) && <Badge color="sky">اليوم</Badge>}
              </div>

              <div className="space-y-2">
                {day.trips.map((t) => (
                  <Link
                    key={t.id}
                    href={`/trips/${t.id}`}
                    className="flex flex-wrap items-center gap-2 rounded-lg bg-sky-50 border border-sky-100 px-3 py-2 text-sm hover:bg-sky-100 transition"
                  >
                    <span>🧳</span>
                    <span className="font-medium text-slate-800">بداية رحلة: {t.program.name}</span>
                    <span className="text-slate-500">— {t.customer.name}</span>
                    <span className="text-xs text-slate-400">({t.numPax} أشخاص)</span>
                  </Link>
                ))}
                {day.orders.map((to) => (
                  <div
                    key={to.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-sm"
                  >
                    <span>{to.assigneeType === "GUIDE" ? "🧭" : "🚗"}</span>
                    <span className="font-medium text-slate-800">
                      {to.guide?.name ?? to.driver?.name ?? "—"}
                    </span>
                    <Badge color={to.assigneeType === "GUIDE" ? "sky" : "amber"}>
                      {to.assigneeType === "GUIDE" ? "مرشد" : "سائق"}
                    </Badge>
                    <span className="text-slate-500">
                      رحلة {to.trip.program.name} — {to.trip.customer.name}
                    </span>
                    <Link
                      href={`/task-orders/${to.id}/pdf`}
                      target="_blank"
                      className="text-sky-600 text-xs hover:underline mr-auto"
                    >
                      أمر التكليف PDF
                    </Link>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
