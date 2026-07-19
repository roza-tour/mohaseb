"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { firstErrorMessage, withError } from "@/lib/formErrors";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// كل إجراءات إدارة المستخدمين للمدير فقط
async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.email || role !== "ADMIN") {
    redirect(withError("/settings/users", "هذه الصفحة متاحة لحساب المدير فقط"));
  }
  return session.user.email!;
}

const userSchema = z.object({
  name: z.string().min(1, "اسم المستخدم مطلوب"),
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
  role: z.enum(["ADMIN", "STAFF"]).default("STAFF"),
});

export async function createUser(formData: FormData) {
  await requireAdmin();
  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role") || undefined,
  });
  if (!parsed.success) redirect(withError("/settings/users", firstErrorMessage(parsed.error)));

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) redirect(withError("/settings/users", "يوجد مستخدم مسجل بهذا البريد الإلكتروني مسبقاً"));

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
    },
  });
  revalidatePath("/settings/users");
}

export async function deleteUser(id: string) {
  const adminEmail = await requireAdmin();
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return;
  if (target.email === adminEmail) {
    redirect(withError("/settings/users", "لا يمكنك حذف حسابك الحالي"));
  }
  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      redirect(withError("/settings/users", "لا يمكن حذف آخر حساب مدير في النظام"));
    }
  }
  await prisma.user.delete({ where: { id } });
  revalidatePath("/settings/users");
}

export async function resetUserPassword(id: string, formData: FormData) {
  await requireAdmin();
  const password = String(formData.get("newPassword") || "");
  if (password.length < 8) {
    redirect(withError("/settings/users", "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل"));
  }
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });
  revalidatePath("/settings/users");
}
