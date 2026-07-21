"use server";

import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withError } from "@/lib/formErrors";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const MAX_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED = ["image/", "application/pdf"];

export async function createAttachment(tripId: string, formData: FormData) {
  if (!(await auth())?.user?.email) redirect("/login");
  const file = formData.get("file") as File | null;
  const labelRaw = formData.get("label");
  const label = typeof labelRaw === "string" && labelRaw.trim() !== "" ? labelRaw.trim() : null;

  if (!file || file.size === 0) {
    redirect(withError(`/trips/${tripId}`, "اختر ملفاً للرفع"));
  }
  if (file.size > MAX_SIZE) {
    redirect(withError(`/trips/${tripId}`, "حجم الملف يتجاوز 8 ميغابايت"));
  }
  if (!ALLOWED.some((p) => file.type.startsWith(p))) {
    redirect(withError(`/trips/${tripId}`, "يسمح فقط برفع الصور وملفات PDF"));
  }

  // اسم ملف آمن فريد مع الحفاظ على الامتداد
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const filename = `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  // خارج مجلد public (بيانات حساسة كالجوازات) — تُقدَّم عبر مسار محمي بتسجيل الدخول
  const dir = path.join(process.cwd(), "private_uploads", "attachments");
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  await prisma.attachment.create({
    data: {
      tripId,
      label: label ?? file.name,
      path: filename, // اسم الملف فقط (يُقرأ من private_uploads)
      size: file.size,
    },
  });
  revalidatePath(`/trips/${tripId}`);
}

export async function deleteAttachment(tripId: string, id: string) {
  if (!(await auth())?.user?.email) redirect("/login");
  const att = await prisma.attachment.findUnique({ where: { id } });
  if (att) {
    const disk = att.path.startsWith("/")
      ? path.join(process.cwd(), "public", att.path.replace(/^\//, ""))
      : path.join(process.cwd(), "private_uploads", "attachments", att.path);
    try {
      await fs.promises.unlink(disk);
    } catch {
      // الملف غير موجود على القرص — نحذف السجل فقط
    }
    await prisma.attachment.delete({ where: { id } });
  }
  revalidatePath(`/trips/${tripId}`);
}
