import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildReminderDigest } from "@/lib/reminders";
import { isEmailConfigured, sendBulkEmail } from "@/lib/email";

// إرسال رسالة التذكير اليومية إلى بريد الوكالة.
// يمكن استدعاؤها إمّا بجلسة مستخدم (زر «أرسل الآن») أو عبر Cron
// بتمرير الرمز السري: /api/reminders/email?token=CRON_SECRET
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
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

  const digest = await buildReminderDigest();
  if (!digest) return NextResponse.json({ ok: false, error: "تعذّر بناء التذكير" }, { status: 200 });

  // لا نرسل رسالة فارغة عند تشغيل Cron التلقائي (لكن نرسلها عند الطلب اليدوي بجلسة)
  const manual = Boolean(await auth());
  if (digest.empty && !manual) {
    return NextResponse.json({ ok: true, skipped: "لا توجد تنبيهات اليوم" });
  }

  const result = await sendBulkEmail([to], digest.subject, digest.html);
  return NextResponse.json({ ok: result.ok > 0, sent: result.ok, failed: result.failed, error: result.error, to });
}
