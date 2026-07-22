import { prisma } from "@/lib/prisma";

export async function getUpcomingTrips(daysAheadOverride?: number) {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const daysAhead = daysAheadOverride ?? settings?.reminderDaysAhead ?? 7;

  // بداية اليوم (UTC) حتى تظهر الرحلات التي تبدأ اليوم — تواريخ الرحلات مخزَّنة عند منتصف ليل UTC
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setUTCDate(horizon.getUTCDate() + daysAhead);
  horizon.setUTCHours(23, 59, 59, 999);

  const trips = await prisma.trip.findMany({
    where: {
      startDate: { gte: today, lte: horizon },
      status: { notIn: ["CANCELLED", "COMPLETED"] },
    },
    include: { program: true, customer: true },
    orderBy: { startDate: "asc" },
  });

  return trips.map((t) => ({
    id: t.id,
    programName: t.program.name,
    customerName: t.customer.name,
    startDate: t.startDate,
    daysRemaining: Math.round((t.startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
    status: t.status,
  }));
}

// الرحلات التي بها مستحقات متبقية على العميل (لم يُدفع كامل السعر المتفق عليه)
export async function getOutstandingTrips() {
  const trips = await prisma.trip.findMany({
    where: { status: { notIn: ["CANCELLED"] } },
    include: { customer: true, program: true, payments: true },
  });
  return trips
    .map((t) => {
      const paid = t.payments.reduce((s, p) => s + p.amount, 0);
      return {
        id: t.id,
        programName: t.program.name,
        customerName: t.customer.name,
        currency: t.currency,
        remaining: t.agreedPrice - paid,
      };
    })
    .filter((t) => t.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining);
}

// بناء رسالة التذكير اليومية (HTML) بالرحلات القادمة والمستحقات المتبقية
export async function buildReminderDigest(): Promise<{ subject: string; html: string; empty: boolean } | null> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const agencyName = settings?.agencyName?.trim() || "روزا تور";
  const [upcoming, outstanding] = await Promise.all([getUpcomingTrips(), getOutstandingTrips()]);

  const fmtDate = (d: Date) =>
    `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
  const fmtMoney = (n: number, c: string) =>
    `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${c}`;

  const upcomingRows = upcoming
    .map(
      (t) =>
        `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${t.programName}</td>
         <td style="padding:6px 10px;border-bottom:1px solid #eee">${t.customerName}</td>
         <td style="padding:6px 10px;border-bottom:1px solid #eee">${fmtDate(t.startDate)}</td>
         <td style="padding:6px 10px;border-bottom:1px solid #eee">${t.daysRemaining <= 0 ? "اليوم" : `خلال ${t.daysRemaining} يوم`}</td></tr>`
    )
    .join("");
  const outstandingRows = outstanding
    .map(
      (t) =>
        `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${t.programName}</td>
         <td style="padding:6px 10px;border-bottom:1px solid #eee">${t.customerName}</td>
         <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#b91c1c;font-weight:bold">${fmtMoney(t.remaining, t.currency)}</td></tr>`
    )
    .join("");

  const section = (title: string, headers: string[], rows: string) =>
    `<h3 style="margin:20px 0 8px;color:#0f172a">${title}</h3>` +
    (rows
      ? `<table style="border-collapse:collapse;width:100%;font-size:14px"><thead><tr>${headers
          .map((h) => `<th style="text-align:right;padding:6px 10px;background:#f1f5f9">${h}</th>`)
          .join("")}</tr></thead><tbody>${rows}</tbody></table>`
      : `<p style="color:#64748b;font-size:14px">لا يوجد</p>`);

  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a" dir="rtl">
    <div style="max-width:640px;margin:0 auto;background:#fff;padding:24px">
      <div style="text-align:center;border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:8px">
        <div style="font-size:20px;font-weight:bold">${agencyName}</div>
        <div style="font-size:13px;color:#64748b">تذكير يومي — ${fmtDate(new Date())}</div>
      </div>
      ${section("🔔 رحلات قادمة قريباً", ["البرنامج", "العميل", "تاريخ البدء", "المتبقي"], upcomingRows)}
      ${section("💰 مستحقات متبقية لدى العملاء", ["البرنامج", "العميل", "المبلغ المتبقي"], outstandingRows)}
    </div></body></html>`;

  return {
    subject: `تذكير يومي — ${agencyName}`,
    html,
    empty: upcoming.length === 0 && outstanding.length === 0,
  };
}
