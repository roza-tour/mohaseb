import { prisma } from "@/lib/prisma";
import { findTripsWithNames } from "@/lib/safeRead";
import { appUrl } from "@/lib/share";
import { isEmailConfigured, sendBulkEmail } from "@/lib/email";

// بداية اليوم ونهاية المهلة (UTC) — تواريخ الرحلات مخزَّنة عند منتصف ليل UTC
function reminderWindow(daysAhead: number) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setUTCDate(horizon.getUTCDate() + daysAhead);
  horizon.setUTCHours(23, 59, 59, 999);
  return { today, horizon };
}

function daysUntil(start: Date, today: Date): number {
  return Math.round((start.getTime() - today.getTime()) / 86400000);
}

// الرحلات القادمة خلال المهلة — لبطاقة «رحلات قادمة قريباً» في الصفحة الرئيسية
export async function getUpcomingTrips(daysAheadOverride?: number) {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const daysAhead = daysAheadOverride ?? settings?.reminderDaysAhead ?? 7;
  const { today, horizon } = reminderWindow(daysAhead);

  const trips = await findTripsWithNames({
    where: {
      startDate: { gte: today, lte: horizon },
      status: { notIn: ["CANCELLED", "COMPLETED"] },
    },
    orderBy: { startDate: "asc" },
  });

  return trips.map((t) => ({
    id: t.id,
    programName: t.programName,
    customerName: t.customerName,
    startDate: t.startDate,
    daysRemaining: daysUntil(t.startDate, today),
    status: t.status,
  }));
}

// ---------- تذكير قبل كل رحلة ----------
//
// بدل ملخّص يومي يصل كل صباح، تصل رسالة واحدة لكل رحلة حين تدخل مهلة التذكير
// (عدد الأيام في الإعدادات)، تسمّي الرحلة بعينها: برنامجها وتاريخها وعميلها.
// لا تتكرر: نحفظ وقت إرسالها في الرحلة (reminderSentAt). وإن تغيّر تاريخ بداية
// الرحلة يُصفَّر فيصل تذكير جديد للتاريخ الجديد.
// الفحص يجري يومياً عبر cron، لكنه لا يرسل شيئاً ما لم تقترب رحلة.

const STATUS_AR: Record<string, string> = {
  PLANNED: "مخطط لها",
  CONFIRMED: "مؤكدة",
  IN_PROGRESS: "قيد التنفيذ",
};

function fmtDate(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] || c);
}

function whenText(days: number): string {
  if (days <= 0) return "تبدأ اليوم";
  if (days === 1) return "تبدأ غداً";
  if (days === 2) return "تبدأ بعد يومين";
  return `تبدأ بعد ${days} أيام`;
}

export type TripReminder = {
  id: string;
  programName: string;
  customerName: string;
  customerPhone: string | null;
  startDate: Date;
  endDate: Date;
  numPax: number;
  status: string;
  daysRemaining: number;
};

// الرحلات التي حان تذكيرها ولم يُرسَل لها تذكير بعد
export async function getDueTripReminders(): Promise<TripReminder[]> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const { today, horizon } = reminderWindow(settings?.reminderDaysAhead ?? 7);

  const trips = await findTripsWithNames({
    where: {
      startDate: { gte: today, lte: horizon },
      status: { notIn: ["CANCELLED", "COMPLETED"] },
      reminderSentAt: null,
    },
    orderBy: { startDate: "asc" },
  });
  if (trips.length === 0) return [];

  // هاتف العميل يُقرأ منفصلاً — عميل محذوف لا يُسقط التذكير
  const customers = await prisma.customer.findMany({
    where: { id: { in: [...new Set(trips.map((t) => t.customerId))] } },
    select: { id: true, phone: true },
  });
  const phoneById = new Map(customers.map((c) => [c.id, c.phone]));

  return trips.map((t) => ({
    id: t.id,
    programName: t.programName,
    customerName: t.customerName,
    customerPhone: phoneById.get(t.customerId) ?? null,
    startDate: t.startDate,
    endDate: t.endDate,
    numPax: t.numPax,
    status: t.status,
    daysRemaining: daysUntil(t.startDate, today),
  }));
}

// رسالة تذكير برحلة واحدة
export function buildTripReminderEmail(t: TripReminder, agencyName: string): { subject: string; html: string } {
  const when = whenText(t.daysRemaining);
  const link = `${appUrl()}/trips/${t.id}`;
  const row = (label: string, value: string) =>
    `<tr><td style="padding:8px 12px;background:#f8fafc;color:#475569;width:38%;border-bottom:1px solid #e2e8f0">${label}</td>` +
    `<td style="padding:8px 12px;font-weight:bold;border-bottom:1px solid #e2e8f0">${value}</td></tr>`;

  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a" dir="rtl">
    <div style="max-width:560px;margin:0 auto;background:#fff;padding:24px">
      <div style="text-align:center;border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:16px">
        <div style="font-size:20px;font-weight:bold">${escapeHtml(agencyName)}</div>
        <div style="font-size:13px;color:#64748b">تذكير برحلة</div>
      </div>
      <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px;text-align:center;font-size:16px;font-weight:bold;margin-bottom:16px">
        🔔 ${when} — ${fmtDate(t.startDate)}
      </div>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        ${row("البرنامج", escapeHtml(t.programName))}
        ${row("العميل", escapeHtml(t.customerName))}
        ${t.customerPhone ? row("هاتف العميل", `<span dir="ltr">${escapeHtml(t.customerPhone)}</span>`) : ""}
        ${row("تاريخ البداية", fmtDate(t.startDate))}
        ${row("تاريخ النهاية", fmtDate(t.endDate))}
        ${row("عدد المسافرين", String(t.numPax))}
        ${row("الحالة", STATUS_AR[t.status] ?? t.status)}
      </table>
      <div style="text-align:center;margin-top:20px">
        <a href="${link}" style="display:inline-block;background:#0284c7;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px">فتح الرحلة</a>
      </div>
    </div></body></html>`;

  return {
    subject: `تذكير: ${t.programName} — ${t.customerName} — ${fmtDate(t.startDate)}`,
    html,
  };
}

// يرسل تذكيراً لكل رحلة حان موعد تذكيرها، ويعلّمها حتى لا يتكرر
export async function sendDueTripReminders(to: string): Promise<{
  sent: TripReminder[];
  failed: number;
  error?: string;
}> {
  if (!isEmailConfigured()) return { sent: [], failed: 0, error: "SMTP غير مُعدّ" };
  const due = await getDueTripReminders();
  if (due.length === 0) return { sent: [], failed: 0 };

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const agencyName = settings?.agencyName?.trim() || "روزا تور";

  const sent: TripReminder[] = [];
  let failed = 0;
  let error: string | undefined;
  for (const t of due) {
    const { subject, html } = buildTripReminderEmail(t, agencyName);
    const res = await sendBulkEmail([to], subject, html);
    if (res.ok > 0) {
      // نعلّم الرحلة بعد نجاح الإرسال فقط — الفاشلة تُعاد في الفحص التالي
      await prisma.trip.update({ where: { id: t.id }, data: { reminderSentAt: new Date() } });
      sent.push(t);
    } else {
      failed++;
      error = res.error;
    }
  }
  return { sent, failed, error };
}
