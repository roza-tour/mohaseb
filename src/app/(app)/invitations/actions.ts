"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { buildDocNumber } from "@/lib/documents";
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

  revalidatePath("/invitations");
  revalidatePath("/accounting/transactions");
  redirect(`/invitations/${created.id}/pdf`);
}

export async function deleteInvitation(id: string) {
  // حذف الدعوة يحذف قيد الإيراد المرتبط تلقائياً (onDelete: Cascade)
  await prisma.invitation.delete({ where: { id } });
  revalidatePath("/invitations");
  revalidatePath("/accounting/transactions");
}
