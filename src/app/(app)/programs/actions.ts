"use server";

import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { requireUser } from "@/lib/authz";
import { revalidatePath } from "next/cache";
import { withError } from "@/lib/formErrors";
import { redirect } from "next/navigation";
import { z } from "zod";

const programSchema = z.object({
  name: z.string().optional().default(""),
  description: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : null)),
  durationDays: z.coerce.number().int().min(1).default(1),
  standardPrice: z.coerce.number().min(0).default(0),
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
  await requireUser();
  const data = parseProgramForm(formData);

  const created = await prisma.tourProgram.create({ data });
  await logActivity("create", "TourProgram", created.name || "برنامج بلا اسم");

  revalidatePath("/programs");
  redirect("/programs");
}

export async function updateProgram(id: string, formData: FormData) {
  await requireUser();
  const data = parseProgramForm(formData);

  await prisma.tourProgram.update({ where: { id }, data });

  revalidatePath("/programs");
  redirect("/programs");
}

export async function deleteProgram(id: string) {
  await requireUser();
  let deactivated = false;
  const program = await prisma.tourProgram.findUnique({ where: { id }, select: { name: true } });
  try {
    await prisma.tourProgram.delete({ where: { id } });
  } catch {
    // على الأغلب فشل الحذف بسبب وجود رحلات مرتبطة بهذا البرنامج (قيد foreign key)
    // في هذه الحالة نكتفي بتعطيل البرنامج بدلاً من حذفه
    await prisma.tourProgram.update({ where: { id }, data: { isActive: false } });
    deactivated = true;
  }
  await logActivity(
    deactivated ? "update" : "delete",
    "TourProgram",
    deactivated ? `تعطيل البرنامج ${program?.name ?? ""}` : (program?.name ?? "")
  );
  revalidatePath("/programs");
  // نخبر المستخدم بالنتيجة بدل أن يبقى البرنامج ظاهراً وكأن الحذف لم يعمل
  if (deactivated) {
    redirect(
      withError(
        "/programs",
        "لم يُحذف البرنامج لارتباطه برحلات مسجَّلة — تم تعطيله فقط فلا يظهر عند إنشاء رحلات جديدة"
      )
    );
  }
}
