"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const programSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  description: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : null)),
  durationDays: z.coerce.number().int().min(1, "يجب أن تكون مدة البرنامج يوماً واحداً على الأقل"),
  standardPrice: z.coerce.number().min(0, "يجب أن يكون السعر صفراً أو أكثر"),
  estHotelCostPerNight: z.coerce.number().min(0).default(0),
  estTransportCost: z.coerce.number().min(0).default(0),
  estGuideFee: z.coerce.number().min(0).default(0),
  estOtherCosts: z.coerce.number().min(0).default(0),
  currency: z.string().min(1).default("DZD"),
  itinerary: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : null)),
  isActive: z.boolean().default(true),
});

function parseProgramForm(formData: FormData) {
  return programSchema.parse({
    name: formData.get("name"),
    description: formData.get("description"),
    durationDays: formData.get("durationDays") || undefined,
    standardPrice: formData.get("standardPrice") || undefined,
    estHotelCostPerNight: formData.get("estHotelCostPerNight") || undefined,
    estTransportCost: formData.get("estTransportCost") || undefined,
    estGuideFee: formData.get("estGuideFee") || undefined,
    estOtherCosts: formData.get("estOtherCosts") || undefined,
    currency: formData.get("currency") || undefined,
    itinerary: formData.get("itinerary"),
    isActive: formData.get("isActive") === "on",
  });
}

export async function createProgram(formData: FormData) {
  const data = parseProgramForm(formData);

  await prisma.tourProgram.create({ data });

  revalidatePath("/programs");
  redirect("/programs");
}

export async function updateProgram(id: string, formData: FormData) {
  const data = parseProgramForm(formData);

  await prisma.tourProgram.update({ where: { id }, data });

  revalidatePath("/programs");
  redirect("/programs");
}

export async function deleteProgram(id: string) {
  try {
    await prisma.tourProgram.delete({ where: { id } });
  } catch {
    // على الأغلب فشل الحذف بسبب وجود رحلات مرتبطة بهذا البرنامج (قيد foreign key)
    // في هذه الحالة نكتفي بتعطيل البرنامج بدلاً من حذفه
    await prisma.tourProgram.update({ where: { id }, data: { isActive: false } });
  }
  revalidatePath("/programs");
}
