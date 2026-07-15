"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildDocNumber, docStyleFromForm } from "@/lib/documents";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const documentSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  tripId: z.string().optional(),
  customerId: z.string().optional(),
  docDate: z.coerce.date(),
  showStamp: z.boolean(),
});

export async function createDocument(formData: FormData) {
  const data = documentSchema.parse({
    title: formData.get("title"),
    body: formData.get("body"),
    tripId: formData.get("tripId") || undefined,
    customerId: formData.get("customerId") || undefined,
    docDate: formData.get("docDate") || new Date(),
    showStamp: formData.get("showStamp") === "on",
  });

  const year = data.docDate.getFullYear();
  const countThisYear = await prisma.document.count({
    where: {
      docDate: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      },
    },
  });

  const created = await prisma.document.create({
    data: {
      docNumber: buildDocNumber(year, countThisYear),
      title: data.title,
      body: data.body,
      tripId: data.tripId || null,
      customerId: data.customerId || null,
      docDate: data.docDate,
      showStamp: data.showStamp,
      style: docStyleFromForm(formData),
    },
  });

  redirect(`/documents/${created.id}/pdf`);
}

export async function deleteDocument(id: string) {
  await prisma.document.delete({ where: { id } });
  revalidatePath("/documents");
}

// ---------- القوالب ----------

const templateSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
});

export async function createTemplate(formData: FormData) {
  const data = templateSchema.parse({
    name: formData.get("name"),
    title: formData.get("title"),
    body: formData.get("body"),
  });
  await prisma.documentTemplate.create({ data: { ...data, style: docStyleFromForm(formData) } });
  redirect("/documents/templates");
}

export async function updateTemplate(id: string, formData: FormData) {
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
  await prisma.documentTemplate.delete({ where: { id } });
  revalidatePath("/documents/templates");
}
