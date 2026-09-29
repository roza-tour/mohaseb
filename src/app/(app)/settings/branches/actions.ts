"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { saveUpload } from "@/lib/uploads";
import { logActivity } from "@/lib/activity";
import { firstErrorMessage, withError } from "@/lib/formErrors";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const BACK = "/settings/branches";

const branchSchema = z.object({
  name: z.string().trim().min(1, "اسم الفرع مطلوب"),
  tagline: z.string().optional().default(""),
  address: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().optional().default(""),
  website: z.string().optional().default(""),
  rc: z.string().optional().default(""),
  letterheadColor: z
    .string()
    .optional()
    .transform((v) => (v && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null)),
  bankDetails: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v.trim() : null)),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().default(0),
});

function readForm(formData: FormData) {
  return branchSchema.safeParse({
    name: formData.get("name") ?? "",
    tagline: formData.get("tagline") ?? "",
    address: formData.get("address") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    website: formData.get("website") ?? "",
    rc: formData.get("rc") ?? "",
    letterheadColor: formData.get("letterheadColor") ?? undefined,
    bankDetails: formData.get("bankDetails") ?? undefined,
    isActive: formData.get("isActive") === "on",
    sortOrder: formData.get("sortOrder") || 0,
  });
}

// الشعار والختم اختياريان — إن لم تُرفع صورة نُبقي القديمة كما هي
async function readImages(formData: FormData) {
  const logoFile = formData.get("logo") as File | null;
  const stampFile = formData.get("stamp") as File | null;
  const logoPath = logoFile ? await saveUpload(logoFile, "branch-logo") : undefined;
  const stampPath = stampFile ? await saveUpload(stampFile, "branch-stamp") : undefined;
  return { logoPath, stampPath };
}

export async function createBranch(formData: FormData) {
  await requireAdmin(BACK);
  const parsed = readForm(formData);
  if (!parsed.success) redirect(withError(BACK, firstErrorMessage(parsed.error)));

  let images;
  try {
    images = await readImages(formData);
  } catch (e) {
    redirect(withError(BACK, e instanceof Error ? e.message : "تعذّر حفظ الصورة"));
  }

  const created = await prisma.branch.create({
    data: {
      ...parsed.data,
      ...(images.logoPath && { logoPath: images.logoPath }),
      ...(images.stampPath && { stampPath: images.stampPath }),
    },
  });
  await logActivity("create", "Branch", `فرع ${created.name}`);
  revalidatePath(BACK);
  redirect(`${BACK}?saved=${encodeURIComponent(`أُضيف الفرع ${created.name}`)}`);
}

export async function updateBranch(id: string, formData: FormData) {
  await requireAdmin(BACK);
  const parsed = readForm(formData);
  if (!parsed.success) redirect(withError(BACK, firstErrorMessage(parsed.error)));

  let images;
  try {
    images = await readImages(formData);
  } catch (e) {
    redirect(withError(BACK, e instanceof Error ? e.message : "تعذّر حفظ الصورة"));
  }

  const updated = await prisma.branch.update({
    where: { id },
    data: {
      ...parsed.data,
      ...(images.logoPath && { logoPath: images.logoPath }),
      ...(images.stampPath && { stampPath: images.stampPath }),
    },
  });
  await logActivity("update", "Branch", `تعديل فرع ${updated.name}`);
  revalidatePath(BACK);
  redirect(`${BACK}?saved=${encodeURIComponent(`حُفظت بيانات ${updated.name}`)}`);
}

export async function deleteBranch(id: string) {
  await requireAdmin(BACK);
  const branch = await prisma.branch.findUnique({ where: { id }, select: { name: true } });
  // الفواتير الصادرة عن الفرع تبقى كما هي؛ يُفرَّغ ربطها فقط (onDelete: SetNull)
  await prisma.branch.delete({ where: { id } });
  await logActivity("delete", "Branch", `حذف فرع ${branch?.name ?? ""}`);
  revalidatePath(BACK);
}
