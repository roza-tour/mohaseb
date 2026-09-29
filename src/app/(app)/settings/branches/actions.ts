"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { logActivity } from "@/lib/activity";
import { firstErrorMessage, withError } from "@/lib/formErrors";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const BACK = "/settings/branches";

const branchSchema = z.object({
  name: z.string().trim().min(1, "اسم الفرع بالعربية مطلوب"),
  // الاسم بالفرنسية والإنجليزية — الفارغ منهما يُستعمل مكانه الاسم العربي
  nameFr: z.string().trim().optional().default(""),
  nameEn: z.string().trim().optional().default(""),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().default(0),
});

export async function createBranch(formData: FormData) {
  await requireAdmin(BACK);
  const parsed = branchSchema.safeParse({
    name: formData.get("name") ?? "",
    nameFr: formData.get("nameFr") ?? "",
    nameEn: formData.get("nameEn") ?? "",
    isActive: true,
    sortOrder: formData.get("sortOrder") || 0,
  });
  if (!parsed.success) redirect(withError(BACK, firstErrorMessage(parsed.error)));

  const created = await prisma.branch.create({ data: parsed.data });
  await logActivity("create", "Branch", `فرع ${created.name}`);
  revalidatePath(BACK);
  redirect(`${BACK}?saved=${encodeURIComponent(`أُضيف الفرع ${created.name}`)}`);
}

export async function updateBranch(id: string, formData: FormData) {
  await requireAdmin(BACK);
  const parsed = branchSchema.safeParse({
    name: formData.get("name") ?? "",
    nameFr: formData.get("nameFr") ?? "",
    nameEn: formData.get("nameEn") ?? "",
    isActive: formData.get("isActive") === "on",
    sortOrder: formData.get("sortOrder") || 0,
  });
  if (!parsed.success) redirect(withError(BACK, firstErrorMessage(parsed.error)));

  const updated = await prisma.branch.update({ where: { id }, data: parsed.data });
  await logActivity("update", "Branch", `تعديل فرع ${updated.name}`);
  revalidatePath(BACK);
  redirect(`${BACK}?saved=${encodeURIComponent(`حُفظ الفرع ${updated.name}`)}`);
}

export async function deleteBranch(id: string) {
  await requireAdmin(BACK);
  const branch = await prisma.branch.findUnique({ where: { id }, select: { name: true } });
  // الفواتير الصادرة تبقى كما هي؛ يُفرَّغ ربطها بالفرع فقط (onDelete: SetNull)
  await prisma.branch.delete({ where: { id } });
  await logActivity("delete", "Branch", `حذف فرع ${branch?.name ?? ""}`);
  revalidatePath(BACK);
}
