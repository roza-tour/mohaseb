import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runCleanup, previewCleanup } from "@/lib/tripCleanup";
import { searchParamsOf } from "@/lib/reqUrl";

// التنظيف التلقائي للجداول: حذف الرحلات المنتهية وأوامر التكليف المنقضية.
// يُستدعى من cron يومياً بالرمز السري:  /api/cleanup?token=CRON_SECRET
// أو من زر «تشغيل الآن» في صفحة الإعدادات (بجلسة مدير).
// لا يعمل إطلاقاً ما لم يُفعَّل الخيار من صفحة الإعدادات.
export async function GET(req: Request) {
  const params = searchParamsOf(req.url);
  const token = params.get("token");
  const cronSecret = process.env.CRON_SECRET;
  const session = await auth();

  const authorized = (cronSecret && token === cronSecret) || Boolean(session?.user?.email);
  if (!authorized) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings?.autoCleanupEnabled) {
    return NextResponse.json({ ok: true, skipped: "التنظيف التلقائي غير مفعَّل في الإعدادات" });
  }

  const days = settings.autoCleanupDaysAfter;
  // معاينة فقط عند تمرير preview=1 (لا يحذف شيئاً)
  if (params.get("preview") === "1") {
    return NextResponse.json({ ok: true, preview: await previewCleanup(days), days });
  }

  const result = await runCleanup(days);
  return NextResponse.json({ ok: true, deleted: result, days });
}
