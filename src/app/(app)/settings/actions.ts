"use server";

import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const settingsSchema = z.object({
  agencyName: z.string().min(1),
  agencyTagline: z.string().optional().default(""),
  agencyAddress: z.string().optional().default(""),
  agencyPhone: z.string().optional().default(""),
  agencyEmail: z.string().optional().default(""),
  agencyWebsite: z.string().optional().default(""),
  letterheadColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "لون غير صالح").default("#1f3864"),
  defaultCurrency: z.string().min(1).default("DZD"),
  reminderDaysAhead: z.coerce.number().int().min(0).default(7),
});

async function saveUpload(file: File, prefix: string): Promise<string | undefined> {
  if (!file || file.size === 0) return undefined;
  if (!file.type.startsWith("image/")) {
    throw new Error("الملف المرفوع يجب أن يكون صورة");
  }
  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
  const filename = `${prefix}-${Date.now()}.${ext}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.promises.mkdir(uploadsDir, { recursive: true });
  await fs.promises.writeFile(path.join(uploadsDir, filename), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${filename}`;
}

export async function updateSettings(formData: FormData) {
  const data = settingsSchema.parse({
    agencyName: formData.get("agencyName"),
    agencyTagline: formData.get("agencyTagline"),
    agencyAddress: formData.get("agencyAddress"),
    agencyPhone: formData.get("agencyPhone"),
    agencyEmail: formData.get("agencyEmail"),
    agencyWebsite: formData.get("agencyWebsite"),
    letterheadColor: formData.get("letterheadColor"),
    defaultCurrency: formData.get("defaultCurrency"),
    reminderDaysAhead: formData.get("reminderDaysAhead"),
  });

  const logoFile = formData.get("logo") as File | null;
  const stampFile = formData.get("stamp") as File | null;

  const logoPath = logoFile ? await saveUpload(logoFile, "logo") : undefined;
  const stampPath = stampFile ? await saveUpload(stampFile, "stamp") : undefined;

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      ...data,
      ...(logoPath && { logoPath }),
      ...(stampPath && { stampPath }),
    },
    create: {
      id: 1,
      ...data,
      ...(logoPath && { logoPath }),
      ...(stampPath && { stampPath }),
    },
  });

  revalidatePath("/settings");
}

export async function changePassword(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("يجب تسجيل الدخول");
  }

  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (newPassword.length < 8) {
    throw new Error("يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل");
  }
  if (newPassword !== confirmPassword) {
    throw new Error("كلمة المرور الجديدة وتأكيدها غير متطابقين");
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    throw new Error("المستخدم غير موجود");
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new Error("كلمة المرور الحالية غير صحيحة");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  revalidatePath("/settings");
}
