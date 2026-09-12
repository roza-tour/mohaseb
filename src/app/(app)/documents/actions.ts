"use server";

import { z } from "zod";
import { requireUser, requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { docStyleFromForm } from "@/lib/documents";
import { nextDocNumber } from "@/lib/docNumbers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { firstErrorMessage, withError } from "@/lib/formErrors";
import { logActivity } from "@/lib/activity";

const documentSchema = z.object({
  title: z.string().optional().default(""),
  body: z.string().optional().default(""),
  tripId: z.string().optional(),
  customerId: z.string().optional(),
  consulate: z.string().optional().default(""),
  passport: z.string().optional().default(""),
  docDate: z.coerce.date(),
  showStamp: z.boolean(),
});

export async function createDocument(formData: FormData) {
  await requireUser();
  const parsed = documentSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    tripId: formData.get("tripId") || undefined,
    customerId: formData.get("customerId") || undefined,
    consulate: formData.get("consulate") ?? "",
    passport: formData.get("passport") ?? "",
    docDate: formData.get("docDate") || new Date(),
    showStamp: formData.get("showStamp") === "on",
  });
  if (!parsed.success) redirect(withError("/documents/new", firstErrorMessage(parsed.error)));
  const data = parsed.data;

  // نستبدل حقلي القنصلية ورقم الجواز بالقيم المُدخلة (للدعوة)
  let body = data.body;
  if (data.consulate.trim()) body = body.split("[CONSULATE]").join(data.consulate.trim());
  if (data.passport.trim()) body = body.split("[PASSPORT]").join(data.passport.trim());

  const year = data.docDate.getFullYear();
  const docNumber = await nextDocNumber("document", year);

  const created = await prisma.document.create({
    data: {
      docNumber,
      title: data.title,
      body,
      tripId: data.tripId || null,
      customerId: data.customerId || null,
      docDate: data.docDate,
      showStamp: data.showStamp,
      style: docStyleFromForm(formData),
    },
  });

  redirect(`/documents/${created.id}/pdf`);
}

// تعديل مستند صادر (يحتفظ برقمه التسلسلي)
export async function updateDocument(id: string, formData: FormData) {
  await requireUser();
  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) redirect("/documents");
  const back = `/documents/${id}`;

  const parsed = documentSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    customerId: formData.get("customerId") || undefined,
    docDate: formData.get("docDate") || existing.docDate,
    showStamp: formData.get("showStamp") === "on",
  });
  if (!parsed.success) redirect(withError(back, firstErrorMessage(parsed.error)));
  const data = parsed.data;

  await prisma.document.update({
    where: { id },
    data: {
      title: data.title,
      body: data.body,
      customerId: data.customerId || null,
      docDate: data.docDate,
      showStamp: data.showStamp,
      style: docStyleFromForm(formData),
    },
  });

  await logActivity("update", "Document", `تعديل مستند ${existing.docNumber}`);
  revalidatePath("/documents");
  redirect("/documents?updated=1");
}

export async function deleteDocument(id: string) {
  await requireAdmin("/documents");
  await prisma.document.delete({ where: { id } });
  revalidatePath("/documents");
}

// ---------- القوالب ----------

const templateSchema = z.object({
  name: z.string().optional().default(""),
  title: z.string().optional().default(""),
  body: z.string().optional().default(""),
});

export async function createTemplate(formData: FormData) {
  await requireUser();
  const data = templateSchema.parse({
    name: formData.get("name"),
    title: formData.get("title"),
    body: formData.get("body"),
  });
  await prisma.documentTemplate.create({ data: { ...data, style: docStyleFromForm(formData) } });
  redirect("/documents/templates");
}

export async function updateTemplate(id: string, formData: FormData) {
  await requireUser();
  const data = templateSchema.parse({
    name: formData.get("name"),
    title: formData.get("title"),
    body: formData.get("body"),
  });
  await prisma.documentTemplate.update({
    where: { id },
    data: { ...data, style: docStyleFromForm(formData) },
  });
  redirect("/documents/templates");
}

export async function deleteTemplate(id: string) {
  await requireUser();
  await prisma.documentTemplate.delete({ where: { id } });
  revalidatePath("/documents/templates");
}
