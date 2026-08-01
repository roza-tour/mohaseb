"use server";

import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { cleanupLogoStamp } from "@/lib/imageCleanup";
import { docStyleFromForm } from "@/lib/documents";
import { revalidatePath } from "next/cache";

const settingsSchema = z.object({
  agencyName: z.string().optional().default(""),
  agencyTagline: z.string().optional().default(""),
  agencyAddress: z.string().optional().default(""),
  agencyPhone: z.string().optional().default(""),
  agencyEmail: z.string().optional().default(""),
  agencyWebsite: z.string().optional().default(""),
  agencyRC: z.string().optional().default(""),
  letterheadColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "لون غير صالح").default("#1f3864"),
  defaultCurrency: z.string().min(1).default("DZD"),
  reminderDaysAhead: z.coerce.number().int().min(0).default(7),
});

const LOGO_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const LOGO_MAX = 5 * 1024 * 1024; // 5MB

async function saveUpload(file: File, prefix: string): Promise<string | undefined> {
  if (!file || file.size === 0) return undefined;
  if (!LOGO_TYPES.includes(file.type)) {
    throw new Error("يُسمح فقط بصور PNG أو JPG أو WEBP");
  }
  if (file.size > LOGO_MAX) {
    throw new Error("حجم الصورة يتجاوز 5 ميغابايت");
  }
  const raw = Buffer.from(await file.arrayBuffer());

  // الشعار والختم: نفرّغ الخلفية البيضاء تلقائياً (تصبح شفافة) ونحفظها PNG
  let out: Uint8Array = raw;
  let ext = file.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
  try {
    out = await cleanupLogoStamp(raw);
    ext = "png";
  } catch {
    // لو فشلت المعالجة لأي سبب نحفظ الصورة الأصلية كما هي
    out = raw;
  }

  const filename = `${prefix}-${Date.now()}.${ext}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.promises.mkdir(uploadsDir, { recursive: true });
  await fs.promises.writeFile(path.join(uploadsDir, filename), out);
  return `/uploads/${filename}`;
}

export async function updateSettings(formData: FormData) {
  if (!(await auth())?.user?.email) throw new Error("يجب تسجيل الدخول");
  const data = settingsSchema.parse({
    agencyName: formData.get("agencyName"),
    agencyTagline: formData.get("agencyTagline"),
    agencyAddress: formData.get("agencyAddress"),
    agencyPhone: formData.get("agencyPhone"),
    agencyEmail: formData.get("agencyEmail"),
    agencyWebsite: formData.get("agencyWebsite"),
    agencyRC: formData.get("agencyRC"),
    letterheadColor: formData.get("letterheadColor"),
    defaultCurrency: formData.get("defaultCurrency"),
    reminderDaysAhead: formData.get("reminderDaysAhead"),
  });

  // تنسيق المستندات العام (يسري على كل المستندات المولَّدة)
  const docStyle = docStyleFromForm(formData);

  const logoFile = formData.get("logo") as File | null;
  const stampFile = formData.get("stamp") as File | null;

  const logoPath = logoFile ? await saveUpload(logoFile, "logo") : undefined;
  const stampPath = stampFile ? await saveUpload(stampFile, "stamp") : undefined;

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      ...data,
      docStyle,
      ...(logoPath && { logoPath }),
      ...(stampPath && { stampPath }),
    },
    create: {
      id: 1,
      ...data,
      docStyle,
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
