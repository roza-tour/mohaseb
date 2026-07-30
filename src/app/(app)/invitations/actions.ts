"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { buildDocNumber } from "@/lib/documents";
import { logActivity } from "@/lib/activity";
import { firstErrorMessage, withError } from "@/lib/formErrors";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const schema = z.object({
  language: z.enum(["ar", "fr", "en"]).default("fr"),
  consulate: z.string().optional().default(""),
  programId: z.string().optional(),
  itinerary: z.string().optional().default(""),
  arrivalDate: z.coerce.date().optional(),
  departureDate: z.coerce.date().optional(),
  fee: z.coerce.number().min(0).default(20),
  feeCurrency: z.string().min(1).default("USD"),
  notes: z.string().optional().transform((v) => (v && v.trim() !== "" ? v : null)),
});

export async function createInvitation(formData: FormData) {
  if (!(await auth())?.user?.email) redirect("/login");

  const parsed = schema.safeParse({
    language: formData.get("language") || "fr",
    consulate: formData.get("consulate") ?? "",
    programId: formData.get("programId") || undefined,
    itinerary: formData.get("itinerary") ?? "",
    arrivalDate: formData.get("arrivalDate") || undefined,
    departureDate: formData.get("departureDate") || undefined,
    fee: formData.get("fee") || undefined,
    feeCurrency: formData.get("feeCurrency") || undefined,
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) redirect(withError("/invitations/new", firstErrorMessage(parsed.error)));
  const d = parsed.data;

  // الأشخاص: مصفوفتان متوازيتان person_name / person_passport (أولهم المقدّم الأساسي)
  const names = formData.getAll("person_name").map(String);
  const passports = formData.getAll("person_passport").map(String);
  const people: { name: string; passport: string }[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = (names[i] ?? "").trim();
    if (!name) continue;
    people.push({ name, passport: (passports[i] ?? "").trim() });
  }
  if (people.length === 0) {
    redirect(withError("/invitations/new", "أضِف شخصاً واحداً على الأقل للدعوة"));
  }

  const docDate = new Date();
  const year = docDate.getFullYear();
  const count = await prisma.invitation.count({
    where: { docDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
  });

  const created = await prisma.invitation.create({
    data: {
      refNumber: buildDocNumber(year, count),
      language: d.language,
      consulate: d.consulate,
      people,
      programId: d.programId || null,
      itinerary: d.itinerary.trim() || null,
      arrivalDate: d.arrivalDate ?? null,
      departureDate: d.departureDate ?? null,
      fee: d.fee,
      feeCurrency: d.feeCurrency,
      notes: d.notes,
      docDate,
    },
  });

  // قيد إيراد تلقائي: مستحق خدمة الدعوة
  if (d.fee > 0) {
    await prisma.transaction.create({
      data: {
        type: "INCOME",
        category: "خدمة دعوة",
        amount: d.fee,
        currency: d.feeCurrency,
        date: docDate,
        description: `رسم دعوة ${created.refNumber}`,
        invitationId: created.id,
      },
    });
  }

  await logActivity("create", "Invitation", `دعوة ${created.refNumber}`);
  revalidatePath("/invitations");
  revalidatePath("/accounting/transactions");
  redirect(`/invitations/${created.id}/pdf`);
}

// تعديل دعوة صادرة (يحتفظ بالرقم المرجعي وتاريخ الإصدار)
export async function updateInvitation(id: string, formData: FormData) {
  if (!(await auth())?.user?.email) redirect("/login");

  const existing = await prisma.invitation.findUnique({ where: { id } });
  if (!existing) redirect("/invitations");

  const back = `/invitations/${id}`;
  const parsed = schema.safeParse({
    language: formData.get("language") || "fr",
    consulate: formData.get("consulate") ?? "",
    programId: formData.get("programId") || undefined,
    itinerary: formData.get("itinerary") ?? "",
    arrivalDate: formData.get("arrivalDate") || undefined,
    departureDate: formData.get("departureDate") || undefined,
    fee: formData.get("fee") || undefined,
    feeCurrency: formData.get("feeCurrency") || undefined,
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) redirect(withError(back, firstErrorMessage(parsed.error)));
  const d = parsed.data;

  const names = formData.getAll("person_name").map(String);
  const passports = formData.getAll("person_passport").map(String);
  const people: { name: string; passport: string }[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = (names[i] ?? "").trim();
    if (!name) continue;
    people.push({ name, passport: (passports[i] ?? "").trim() });
  }
  if (people.length === 0) redirect(withError(back, "أضِف شخصاً واحداً على الأقل للدعوة"));

  await prisma.invitation.update({
    where: { id },
    data: {
      language: d.language,
      consulate: d.consulate,
      people,
      programId: d.programId || null,
      itinerary: d.itinerary.trim() || null,
      arrivalDate: d.arrivalDate ?? null,
      departureDate: d.departureDate ?? null,
      fee: d.fee,
      feeCurrency: d.feeCurrency,
      notes: d.notes,
    },
  });

  // مزامنة قيد الإيراد المرتبط مع الرسم الجديد
  const linked = await prisma.transaction.findFirst({ where: { invitationId: id } });
  if (d.fee > 0) {
    if (linked) {
      await prisma.transaction.update({
        where: { id: linked.id },
        data: { amount: d.fee, currency: d.feeCurrency },
      });
    } else {
      await prisma.transaction.create({
        data: {
          type: "INCOME",
          category: "خدمة دعوة",
          amount: d.fee,
          currency: d.feeCurrency,
          date: existing.docDate,
          description: `رسم دعوة ${existing.refNumber}`,
          invitationId: id,
        },
      });
    }
  } else if (linked) {
    // صار الرسم صفراً — نحذف القيد حتى لا يبقى إيراد وهمي
    await prisma.transaction.delete({ where: { id: linked.id } });
  }

  await logActivity("update", "Invitation", `تعديل دعوة ${existing.refNumber}`);
  revalidatePath("/invitations");
  revalidatePath("/accounting/transactions");
  redirect(`/invitations?sent=${encodeURIComponent(`تم حفظ تعديلات الدعوة ${existing.refNumber}`)}`);
}

// إرسال الدعوة (PDF) بالبريد إلى عنوان يُدخَل يدوياً (الدعوة لا تُخزّن بريداً)
export async function emailInvitation(id: string, formData: FormData) {
  const to = (formData.get("email") as string)?.trim() || "";
  if (!to) redirect(withError("/invitations", "أدخل بريداً إلكترونياً للإرسال"));

  const { isEmailConfigured, sendDocumentEmail } = await import("@/lib/email");
  if (!isEmailConfigured()) redirect(withError("/invitations", "خدمة البريد غير مُفعّلة على الخادم"));

  const { renderInvitationPdf } = await import("./[id]/pdf/render");
  const result = await renderInvitationPdf(id);
  if (!result) redirect(withError("/invitations", "الدعوة غير موجودة"));

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const agencyName = settings?.agencyName?.trim() || "روزا تور";
  const safeRef = result.refNumber.replace(/[^0-9A-Za-z]/g, "-");
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#0f172a" dir="auto">
    <p>مرفق مستند الدعوة رقم <b>${result.refNumber}</b> من ${agencyName}.</p>
  </div>`;
  const sent = await sendDocumentEmail({
    to,
    subject: `دعوة ${result.refNumber} — ${agencyName}`,
    html,
    filename: `invitation-${safeRef}.pdf`,
    pdf: result.buffer,
  });
  if (!sent.ok) redirect(withError("/invitations", `تعذّر الإرسال: ${sent.error ?? ""}`));

  await logActivity("email", "Invitation", `إرسال دعوة ${result.refNumber} إلى ${to}`);
  redirect(`/invitations?sent=${encodeURIComponent(`تم إرسال الدعوة ${result.refNumber} إلى ${to}`)}`);
}

export async function deleteInvitation(id: string) {
  // حذف الدعوة يحذف قيد الإيراد المرتبط تلقائياً (onDelete: Cascade)
  await prisma.invitation.delete({ where: { id } });
  await logActivity("delete", "Invitation", "حذف دعوة");
  revalidatePath("/invitations");
  revalidatePath("/accounting/transactions");
}

export async function toggleInvitationPaid(id: string) {
  const inv = await prisma.invitation.findUnique({ where: { id }, select: { paid: true, refNumber: true } });
  if (!inv) return;
  await prisma.invitation.update({ where: { id }, data: { paid: !inv.paid } });
  await logActivity("pay", "Invitation", `${inv.refNumber} → ${!inv.paid ? "محصّلة" : "غير محصّلة"}`);
  revalidatePath("/invitations");
}

// تكرار دعوة (نسخة جديدة برقم جديد) — تُسجَّل رسماً جديداً كإيراد
export async function duplicateInvitation(id: string) {
  const src = await prisma.invitation.findUnique({ where: { id } });
  if (!src) redirect("/invitations");
  const docDate = new Date();
  const year = docDate.getFullYear();
  const count = await prisma.invitation.count({
    where: { docDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
  });
  const created = await prisma.invitation.create({
    data: {
      refNumber: buildDocNumber(year, count),
      language: src.language,
      consulate: src.consulate,
      people: src.people ?? [],
      programId: src.programId,
      itinerary: src.itinerary,
      arrivalDate: src.arrivalDate,
      departureDate: src.departureDate,
      fee: src.fee,
      feeCurrency: src.feeCurrency,
      notes: src.notes,
      docDate,
    },
  });
  if (src.fee > 0) {
    await prisma.transaction.create({
      data: {
        type: "INCOME",
        category: "خدمة دعوة",
        amount: src.fee,
        currency: src.feeCurrency,
        date: docDate,
        description: `رسم دعوة ${created.refNumber}`,
        invitationId: created.id,
      },
    });
  }
  await logActivity("duplicate", "Invitation", `نسخة من ${src.refNumber} → ${created.refNumber}`);
  revalidatePath("/accounting/transactions");
  redirect(`/invitations/${created.id}/pdf`);
}
