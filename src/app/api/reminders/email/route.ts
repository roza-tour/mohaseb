import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchParamsOf } from "@/lib/reqUrl";
import { isEmailConfigured } from "@/lib/email";
import { sendDueTripReminders } from "@/lib/reminders";

// تذكير قبل كل رحلة: رسالة لكل رحلة حان موعد تذكيرها، تسمّيها بعينها.
// يُستدعى يومياً من cron بالرمز السري (/api/reminders/email?token=CRON_SECRET)،
// ولا يرسل شيئاً إن لم تقترب رحلة — أو بجلسة من زر «أرسل التذكيرات الآن».
export async function GET(req: Request) {
  const token = searchParamsOf(req.url).get("token");
  const cronSecret = process.env.CRON_SECRET;

  const authorized = (cronSecret && token === cronSecret) || Boolean(await auth());
  if (!authorized) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!isEmailConfigured()) {
    return NextResponse.json({ ok: false, error: "SMTP غير مُعدّ" }, { status: 200 });
  }

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const to = (process.env.REMINDER_TO || settings?.agencyEmail || process.env.SMTP_FROM || "").trim();
  if (!to) {
    return NextResponse.json({ ok: false, error: "لا يوجد بريد للإرسال (عيّن بريد الوكالة أو REMINDER_TO)" }, { status: 200 });
  }

  const result = await sendDueTripReminders(to);
  if (result.sent.length === 0 && result.failed === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "لا توجد رحلات حان تذكيرها الآن" });
  }
  return NextResponse.json({
    ok: result.sent.length > 0,
    sent: result.sent.length,
    failed: result.failed,
    error: result.error,
    to,
    trips: result.sent.map((t) => `${t.programName} — ${t.customerName}`),
  });
}
