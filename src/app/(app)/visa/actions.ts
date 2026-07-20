"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildDocNumber } from "@/lib/documents";
import { firstErrorMessage, withError } from "@/lib/formErrors";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const appSchema = z.object({
  wilaya: z.string().min(1, "اكتب اسم الولاية الموجه إليها الملف"),
  wilayasConcernees: z.string().optional().default(""),
  arrivalDate: z.coerce.date({ message: "تاريخ الوصول مطلوب" }),
  departureDate: z.coerce.date({ message: "تاريخ المغادرة مطلوب" }),
  programDetail: z.string().min(1, "اكتب تفاصيل البرنامج (تُملأ في ملف الوورد)"),
  notes: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : null)),
});

function orEmpty(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

function orDate(v: FormDataEntryValue | null): Date | null {
  const s = orEmpty(v);
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

export async function createVisaApplication(formData: FormData) {
  const parsed = appSchema.safeParse({
    wilaya: formData.get("wilaya"),
    wilayasConcernees: formData.get("wilayasConcernees") ?? "",
    arrivalDate: formData.get("arrivalDate") || undefined,
    departureDate: formData.get("departureDate") || undefined,
    programDetail: formData.get("programDetail"),
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) redirect(withError("/visa/new", firstErrorMessage(parsed.error)));
  if (parsed.data.departureDate < parsed.data.arrivalDate) {
    redirect(withError("/visa/new", "تاريخ المغادرة لا يمكن أن يسبق تاريخ الوصول"));
  }

  // المسافرون من الحقول المتكررة
  const noms = formData.getAll("t_nom").map(String);
  const prenoms = formData.getAll("t_prenom").map(String);
  const naissances = formData.getAll("t_naissance");
  const lieuxN = formData.getAll("t_lieuNaissance").map(String);
  const residences = formData.getAll("t_residence").map(String);
  const types = formData.getAll("t_type").map(String);
  const numeros = formData.getAll("t_numero").map(String);
  const delivrances = formData.getAll("t_delivrance");
  const expirations = formData.getAll("t_expiration");
  const nationalites = formData.getAll("t_nationalite").map(String);
  const visaAnts = formData.getAll("t_visaAnterieur").map(String);

  const travelers = [];
  for (let i = 0; i < noms.length; i++) {
    const nom = noms[i]?.trim();
    const numero = numeros[i]?.trim();
    if (!nom && !numero) continue; // صف فارغ
    if (!nom || !numero) {
      redirect(withError("/visa/new", `المسافر رقم ${i + 1}: اللقب ورقم الجواز مطلوبان`));
    }
    travelers.push({
      nom,
      prenom: prenoms[i]?.trim() ?? "",
      dateNaissance: orDate(naissances[i]),
      lieuNaissance: lieuxN[i]?.trim() ?? "",
      lieuResidence: residences[i]?.trim() ?? "",
      typePasseport: types[i]?.trim() || "Passeport ordinaire",
      numeroPasseport: numero,
      dateDelivrance: orDate(delivrances[i]),
      dateExpiration: orDate(expirations[i]),
      nationalite: nationalites[i]?.trim() ?? "",
      visaAnterieur: visaAnts[i] === "on" || visaAnts[i] === "true",
    });
  }
  if (travelers.length === 0) {
    redirect(withError("/visa/new", "أضف مسافراً واحداً على الأقل"));
  }

  const year = new Date().getFullYear();
  const count = await prisma.visaApplication.count({
    where: { createdAt: { gte: new Date(year, 0, 1) } },
  });

  const created = await prisma.visaApplication.create({
    data: {
      refNumber: buildDocNumber(year, count),
      ...parsed.data,
      travelers: { create: travelers },
    },
  });

  redirect(`/visa?created=${created.id}`);
}

export async function deleteVisaApplication(id: string) {
  await prisma.visaApplication.delete({ where: { id } });
  revalidatePath("/visa");
}
