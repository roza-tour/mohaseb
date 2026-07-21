"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendBulkEmail, offerEmailHtml, isEmailConfigured } from "@/lib/email";
import { firstErrorMessage, withError } from "@/lib/formErrors";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const schema = z.object({
  subject: z.string().min(1, "اكتب عنوان العرض"),
  body: z.string().min(1, "اكتب نص العرض"),
});

export async function createOffer(formData: FormData) {
  if (!(await auth())?.user?.email) redirect("/login");
  const parsed = schema.safeParse({
    subject: String(formData.get("subject") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim(),
  });
  if (!parsed.success) redirect(withError("/offers", firstErrorMessage(parsed.error)));

  await prisma.offer.create({ data: parsed.data });
  revalidatePath("/offers");
  redirect("/offers?created=1");
}

export async function deleteOffer(id: string) {
  await prisma.offer.delete({ where: { id } });
  revalidatePath("/offers");
}

// إرسال العرض بالبريد لكل العملاء الذين لديهم بريد إلكتروني
export async function sendOffer(id: string) {
  if (!(await auth())?.user?.email) redirect("/login");
  if (!isEmailConfigured()) {
    redirect(withError("/offers", "البريد غير مُعدّ — أضِف بيانات SMTP في ملف .env على السيرفر"));
  }

  const [offer, settings, customers] = await Promise.all([
    prisma.offer.findUnique({ where: { id } }),
    prisma.settings.findUnique({ where: { id: 1 } }),
    prisma.customer.findMany({ where: { email: { not: null } }, select: { email: true } }),
  ]);
  if (!offer) redirect(withError("/offers", "العرض غير موجود"));

  const recipients = customers.map((c) => c.email!).filter(Boolean);
  if (recipients.length === 0) {
    redirect(withError("/offers", "لا يوجد عملاء لديهم بريد إلكتروني"));
  }

  const html = offerEmailHtml({
    agencyName: settings?.agencyName?.trim() || "Roza Tour",
    color: settings?.letterheadColor || "#1f3864",
    body: offer.body,
    website: settings?.agencyWebsite,
    phone: settings?.agencyPhone,
  });

  const res = await sendBulkEmail(recipients, offer.subject, html);
  if (res.error) {
    redirect(withError("/offers", `تعذّر الإرسال: ${res.error}`));
  }

  await prisma.offer.update({
    where: { id },
    data: { lastSentAt: new Date(), sentCount: { increment: res.ok } },
  });
  revalidatePath("/offers");
  redirect(`/offers?sent=${res.ok}`);
}
