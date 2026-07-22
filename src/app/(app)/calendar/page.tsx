import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";

const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTH_NAMES = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

// تقويم شهري للعمليات: بداية الرحلات ونهايتها + وصول/مغادرة ملفات الفيزا
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const mParam = typeof sp.m === "string" && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : null;
  const year = mParam ? Number(mParam.slice(0, 4)) : now.getUTCFullYear();
  const month = mParam ? Number(mParam.slice(5, 7)) - 1 : now.getUTCMonth();

  // حدود الشهر بتوقيت UTC (نفس تخزين التواريخ)
  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month + 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstWeekday = monthStart.getUTCDay(); // 0 = الأحد

  const [trips, visas] = await Promise.all([
    prisma.trip.findMany({
      where: {
        status: { notIn: ["CANCELLED"] },
        OR: [
          { startDate: { gte: monthStart, lt: monthEnd } },
          { endDate: { gte: monthStart, lt: monthEnd } },
        ],
      },
      include: { program: true, customer: true },
    }),
    prisma.visaApplication.findMany({
      where: {
        OR: [
          { arrivalDate: { gte: monthStart, lt: monthEnd } },
          { departureDate: { gte: monthStart, lt: monthEnd } },
        ],
      },
    }),
  ]);

  type Ev = { label: string; href?: string; color: string };
  const byDay = new Map<number, Ev[]>();
  const push = (day: number, ev: Ev) => {
    if (day < 1 || day > daysInMonth) return;
    const arr = byDay.get(day) ?? [];
    arr.push(ev);
    byDay.set(day, arr);
  };
  const dayIfInMonth = (d: Date | null | undefined) =>
    d && d >= monthStart && d < monthEnd ? d.getUTCDate() : null;

  for (const t of trips) {
    const sd = dayIfInMonth(t.startDate);
    if (sd) push(sd, { label: `▶ ${t.program.name} — ${t.customer.name}`, href: `/trips/${t.id}`, color: "emerald" });
    const ed = dayIfInMonth(t.endDate);
    if (ed) push(ed, { label: `■ نهاية: ${t.program.name}`, href: `/trips/${t.id}`, color: "slate" });
  }
  for (const v of visas) {
    const ad = dayIfInMonth(v.arrivalDate);
    if (ad) push(ad, { label: `🛬 فيزا ${v.refNumber}`, href: `/visa`, color: "sky" });
    const dd = dayIfInMonth(v.departureDate);
    if (dd) push(dd, { label: `🛫 مغادرة ${v.refNumber}`, href: `/visa`, color: "amber" });
  }

  const colorCls: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
    sky: "bg-sky-50 text-sky-700 border-sky-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };

  // خلايا الشبكة: فراغات قبل أول يوم ثم أيام الشهر
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevM = new Date(Date.UTC(year, month - 1, 1));
  const nextM = new Date(Date.UTC(year, month + 1, 1));
  const qm = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const todayDay =
    now.getUTCFullYear() === year && now.getUTCMonth() === month ? now.getUTCDate() : -1;

  return (
    <div>
      <PageHeader title="التقويم" description="نظرة شهرية على بداية ونهاية الرحلات ومواعيد الفيزا" />

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <Link href={`/calendar?m=${qm(prevM)}`} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm hover:bg-slate-200">
            ‹ الشهر السابق
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-slate-800 text-lg">
              {MONTH_NAMES[month]} {year}
            </h2>
            <Link href="/calendar" className="text-xs text-sky-600 hover:underline">
              اليوم
            </Link>
          </div>
          <Link href={`/calendar?m=${qm(nextM)}`} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm hover:bg-slate-200">
            الشهر التالي ›
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500 mb-1">
          {DAY_NAMES.map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => (
            <div
              key={i}
              className={`min-h-24 rounded-lg border p-1.5 text-right align-top ${
                day === null ? "bg-slate-50/50 border-transparent" : "border-slate-200 bg-white"
              }`}
            >
              {day !== null && (
                <>
                  <div className={`text-xs mb-1 ${day === todayDay ? "font-bold text-sky-600" : "text-slate-400"}`}>
                    {day === todayDay ? (
                      <span className="inline-block rounded-full bg-sky-600 text-white w-5 h-5 leading-5 text-center">{day}</span>
                    ) : (
                      day
                    )}
                  </div>
                  <div className="space-y-1">
                    {(byDay.get(day) ?? []).map((ev, j) =>
                      ev.href ? (
                        <Link
                          key={j}
                          href={ev.href}
                          className={`block truncate rounded border px-1 py-0.5 text-[10px] leading-tight hover:opacity-80 ${colorCls[ev.color]}`}
                          title={ev.label}
                        >
                          {ev.label}
                        </Link>
                      ) : (
                        <span key={j} className={`block truncate rounded border px-1 py-0.5 text-[10px] ${colorCls[ev.color]}`}>
                          {ev.label}
                        </span>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
