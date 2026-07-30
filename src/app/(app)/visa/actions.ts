"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildDocNumber } from "@/lib/documents";
import { logActivity } from "@/lib/activity";
import { firstErrorMessage, withError } from "@/lib/formErrors";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const appSchema = z.object({
  wilaya: z.string().optional().default(""),
  wilayasConcernees: z.string().optional().default(""),
  arrivalDate: z.coerce.date({ message: "تاريخ الوصول مطلوب" }),
  departureDate: z.coerce.date({ message: "تاريخ المغادرة مطلوب" }),
  programDetail: z.string().optional().default(""),
  notes: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : null)),
  feePerPerson: z.coerce.number().min(0).default(40),
  feeCurrency: z.string().min(1).default("USD"),
});

function orEmpty(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

function orDate(v: FormDataEntryValue | null): Date | null {
  const s = orEmpty(v);
  if (!s) return null;
  // UTC حتى تتّسق مع بقية تواريخ الطلب (arrival/departure عبر coerce.date = UTC)
  const d = new Date(s + "T00:00:00Z");
  return isNaN(d.getTime()) ? null : d;
}

// يقرأ صفوف المسافرين من الحقول المتكررة في النموذج
function readTravelers(formData: FormData) {
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
    const nom = noms[i]?.trim() ?? "";
    const numero = numeros[i]?.trim() ?? "";
    // الملف رسمي للمديرية: نُدرج فقط الصفوف التي فيها اللقب ورقم الجواز على الأقل،
    // ونتجاهل بصمت أي صف ناقص حتى لا تظهر أسماء/أرقام فارغة في القائمة الرسمية
    if (!nom || !numero) continue;
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
  return travelers;
}

// تعديل طلب فيزا صادر (يحتفظ برقمه المرجعي) — يستبدل قائمة المسافرين ويزامن قيد الإيراد
export async function updateVisaApplication(id: string, formData: FormData) {
  const existing = await prisma.visaApplication.findUnique({ where: { id } });
  if (!existing) redirect("/visa");
  const back = `/visa/${id}`;

  const parsed = appSchema.safeParse({
    wilaya: formData.get("wilaya"),
    wilayasConcernees: formData.get("wilayasConcernees") ?? "",
    arrivalDate: formData.get("arrivalDate") || undefined,
    departureDate: formData.get("departureDate") || undefined,
    programDetail: formData.get("programDetail"),
    notes: formData.get("notes") ?? undefined,
    feePerPerson: formData.get("feePerPerson") || undefined,
    feeCurrency: formData.get("feeCurrency") || undefined,
  });
  if (!parsed.success) redirect(withError(back, firstErrorMessage(parsed.error)));
  if (parsed.data.departureDate < parsed.data.arrivalDate) {
    redirect(withError(back, "تاريخ المغادرة لا يمكن أن يسبق تاريخ الوصول"));
  }

  const travelers = readTravelers(formData);
  if (travelers.length === 0) redirect(withError(back, "أضف مسافراً واحداً على الأقل"));

  // نستبدل المسافرين بالكامل (أبسط وأضمن من مطابقة كل صف على حدة)
  await prisma.$transaction([
    prisma.visaTraveler.deleteMany({ where: { applicationId: id } }),
    prisma.visaApplication.update({
      where: { id },
      data: { ...parsed.data, travelers: { create: travelers } },
    }),
  ]);

  // مزامنة قيد الإيراد مع الرسم وعدد المسافرين الجديدين
  const total = parsed.data.feePerPerson * travelers.length;
  const linked = await prisma.transaction.findFirst({ where: { visaApplicationId: id } });
  if (total > 0) {
    const description = `رسوم فيزا ${existing.refNumber} (${travelers.length} مسافر)`;
    if (linked) {
      await prisma.transaction.update({
        where: { id: linked.id },
        data: { amount: total, currency: parsed.data.feeCurrency, description },
      });
    } else {
      await prisma.transaction.create({
        data: {
          type: "INCOME",
          category: "خدمة فيزا صحراوية",
          amount: total,
          currency: parsed.data.feeCurrency,
          date: existing.createdAt,
          description,
          visaApplicationId: id,
        },
      });
    }
  } else if (linked) {
    await prisma.transaction.delete({ where: { id: linked.id } });
  }

  await logActivity("update", "Visa", `تعديل طلب فيزا ${existing.refNumber}`);
  revalidatePath("/visa");
  revalidatePath("/accounting/transactions");
  redirect(`/visa?updated=${encodeURIComponent(existing.refNumber)}`);
}

export async function createVisaApplication(formData: FormData) {
  const parsed = appSchema.safeParse({
    wilaya: formData.get("wilaya"),
    wilayasConcernees: formData.get("wilayasConcernees") ?? "",
    arrivalDate: formData.get("arrivalDate") || undefined,
    departureDate: formData.get("departureDate") || undefined,
    programDetail: formData.get("programDetail"),
    notes: formData.get("notes") ?? undefined,
    feePerPerson: formData.get("feePerPerson") || undefined,
    feeCurrency: formData.get("feeCurrency") || undefined,
  });
  if (!parsed.success) redirect(withError("/visa/new", firstErrorMessage(parsed.error)));
  if (parsed.data.departureDate < parsed.data.arrivalDate) {
    redirect(withError("/visa/new", "تاريخ المغادرة لا يمكن أن يسبق تاريخ الوصول"));
  }

  const travelers = readTravelers(formData);
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

  // قيد إيراد تلقائي: مستحق خدمة الفيزا = الرسم لكل فرد × عدد المسافرين
  const total = parsed.data.feePerPerson * travelers.length;
  if (total > 0) {
    await prisma.transaction.create({
      data: {
        type: "INCOME",
        category: "خدمة فيزا صحراوية",
        amount: total,
        currency: parsed.data.feeCurrency,
        date: new Date(),
        description: `رسوم فيزا ${created.refNumber} (${travelers.length} مسافر)`,
        visaApplicationId: created.id,
      },
    });
  }

  revalidatePath("/accounting/transactions");
  redirect(`/visa?created=${created.id}`);
}

export async function deleteVisaApplication(id: string) {
  await prisma.visaApplication.delete({ where: { id } });
  await logActivity("delete", "Visa", "حذف طلب فيزا");
  revalidatePath("/visa");
}

// تكرار طلب فيزا بكل مسافريه (رقم جديد) — يُسجَّل رسم جديد كإيراد
export async function duplicateVisaApplication(id: string) {
  const src = await prisma.visaApplication.findUnique({ where: { id }, include: { travelers: true } });
  if (!src) redirect("/visa");
  const year = new Date().getFullYear();
  const count = await prisma.visaApplication.count({ where: { createdAt: { gte: new Date(year, 0, 1) } } });
  const created = await prisma.visaApplication.create({
    data: {
      refNumber: buildDocNumber(year, count),
      wilaya: src.wilaya,
      wilayasConcernees: src.wilayasConcernees,
      arrivalDate: src.arrivalDate,
      departureDate: src.departureDate,
      programDetail: src.programDetail,
      notes: src.notes,
      feePerPerson: src.feePerPerson,
      feeCurrency: src.feeCurrency,
      travelers: {
        create: src.travelers.map((t) => ({
          nom: t.nom, prenom: t.prenom, dateNaissance: t.dateNaissance,
          lieuNaissance: t.lieuNaissance, lieuResidence: t.lieuResidence, typePasseport: t.typePasseport,
          numeroPasseport: t.numeroPasseport, dateDelivrance: t.dateDelivrance, dateExpiration: t.dateExpiration,
          nationalite: t.nationalite, visaAnterieur: t.visaAnterieur, visaEmission: t.visaEmission, visaExpirationA: t.visaExpirationA,
        })),
      },
    },
  });
  const total = src.feePerPerson * src.travelers.length;
  if (total > 0) {
    await prisma.transaction.create({
      data: { type: "INCOME", category: "خدمة فيزا صحراوية", amount: total, currency: src.feeCurrency, date: new Date(), description: `رسوم فيزا ${created.refNumber} (${src.travelers.length} مسافر)`, visaApplicationId: created.id },
    });
  }
  await logActivity("duplicate", "Visa", `نسخة من ${src.refNumber} → ${created.refNumber}`);
  revalidatePath("/visa");
  revalidatePath("/accounting/transactions");
  redirect("/visa?created=" + created.id);
}
