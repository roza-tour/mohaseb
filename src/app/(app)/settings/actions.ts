"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { saveUpload } from "@/lib/uploads";
import { docStyleFromForm } from "@/lib/documents";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/authz";
import { firstErrorMessage, withError } from "@/lib/formErrors";
import { logActivity } from "@/lib/activity";
import { previewCleanup, runCleanup } from "@/lib/tripCleanup";

const settingsSchema = z.object({
  agencyName: z.string().optional().default(""),
  agencyTagline: z.string().optional().default(""),
  agencyAddress: z.string().optional().default(""),
  agencyPhone: z.string().optional().default(""),
  agencyEmail: z.string().optional().default(""),
  agencyWebsite: z.string().optional().default(""),
  agencyRC: z.string().optional().default(""),
  letterheadColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "لون غير صالح").default("#1f3864"),
  defaultCurrency: z.string().min(1).default("DZD"),
  reminderDaysAhead: z.coerce.number().int().min(0).default(7),
});

export async function updateSettings(formData: FormData) {
  // إعدادات الوكالة وختمها وشعارها تخصّ المدير وحده
  await requireAdmin("/settings");
  const parsed = settingsSchema.safeParse({
    agencyName: formData.get("agencyName"),
    agencyTagline: formData.get("agencyTagline"),
    agencyAddress: formData.get("agencyAddress"),
    agencyPhone: formData.get("agencyPhone"),
    agencyEmail: formData.get("agencyEmail"),
    agencyWebsite: formData.get("agencyWebsite"),
    agencyRC: formData.get("agencyRC"),
    letterheadColor: formData.get("letterheadColor"),
    defaultCurrency: formData.get("defaultCurrency"),
    reminderDaysAhead: formData.get("reminderDaysAhead"),
  });
  if (!parsed.success) redirect(withError("/settings", firstErrorMessage(parsed.error)));
  const data = parsed.data;

  // تنسيق المستندات العام (يسري على كل المستندات المولَّدة)
  const docStyle = docStyleFromForm(formData);

  const logoFile = formData.get("logo") as File | null;
  const stampFile = formData.get("stamp") as File | null;

  // رفع الصور: رسالة الرفض كانت تُرمى كـ Error فتظهر للمستخدم رسالة إنجليزية
  // عامة في وضع الإنتاج — صارت تعود كرسالة عربية أعلى الصفحة.
  let logoPath: string | undefined;
  let stampPath: string | undefined;
  let uploadError: string | null = null;
  try {
    logoPath = logoFile ? await saveUpload(logoFile, "logo") : undefined;
    stampPath = stampFile ? await saveUpload(stampFile, "stamp") : undefined;
  } catch (e) {
    uploadError = e instanceof Error ? e.message : "تعذّر حفظ الصورة";
  }
  if (uploadError) redirect(withError("/settings", uploadError));

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      ...data,
      docStyle,
      ...(logoPath && { logoPath }),
      ...(stampPath && { stampPath }),
    },
    create: {
      id: 1,
      ...data,
      docStyle,
      ...(logoPath && { logoPath }),
      ...(stampPath && { stampPath }),
    },
  });

  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

// حفظ إعدادات التنظيف التلقائي (حذف الرحلات المنتهية وأوامر التكليف المنقضية)
export async function updateCleanupSettings(formData: FormData) {
  await requireAdmin("/settings");
  const enabled = formData.get("autoCleanupEnabled") === "on";
  const rawDays = Number(formData.get("autoCleanupDaysAfter"));
  const days = Number.isFinite(rawDays) ? Math.min(3650, Math.max(0, Math.trunc(rawDays))) : 90;

  await prisma.settings.upsert({
    where: { id: 1 },
    update: { autoCleanupEnabled: enabled, autoCleanupDaysAfter: days },
    create: { id: 1, autoCleanupEnabled: enabled, autoCleanupDaysAfter: days },
  });
  await logActivity(
    "update",
    "Settings",
    enabled ? `تفعيل التنظيف التلقائي بعد ${days} يوماً` : "إيقاف التنظيف التلقائي"
  );
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

// تشغيل التنظيف فوراً من زر في الإعدادات (لا ينتظر مهمة cron)
export async function runCleanupNow() {
  await requireAdmin("/settings");
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings?.autoCleanupEnabled) {
    redirect(withError("/settings", "فعّل التنظيف التلقائي أولاً ثم شغّله"));
  }
  const result = await runCleanup(settings.autoCleanupDaysAfter);
  await logActivity(
    "delete",
    "Cleanup",
    `تنظيف تلقائي: ${result.trips} رحلة و${result.taskOrders} أمر تكليف`
  );
  revalidatePath("/settings");
  revalidatePath("/trips");
  revalidatePath("/task-orders");
  redirect(`/settings?cleaned=${result.trips}-${result.taskOrders}`);
}

// عدد ما سيُحذف لو شُغّل التنظيف الآن — تعرضه صفحة الإعدادات قبل التفعيل
export async function cleanupPreview(days: number) {
  await requireUser();
  return previewCleanup(days);
}

export async function changePassword(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (newPassword.length < 8) {
    redirect(withError("/settings", "يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل"));
  }
  if (newPassword !== confirmPassword) {
    redirect(withError("/settings", "كلمة المرور الجديدة وتأكيدها غير متطابقين"));
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user) redirect(withError("/settings", "المستخدم غير موجود"));

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    redirect(withError("/settings", "كلمة المرور الحالية غير صحيحة"));
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  await logActivity("update", "User", "تغيير كلمة المرور");

  revalidatePath("/settings");
  redirect("/settings?saved=1");
}
