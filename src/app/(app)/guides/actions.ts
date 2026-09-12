"use server";

import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { requireUser } from "@/lib/authz";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { withError } from "@/lib/formErrors";

function str(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function orNull(value: string) {
  return value.length > 0 ? value : null;
}

function buildGuideData(formData: FormData) {
  // الاسم اختياري — يُحفظ فارغاً إن لم يُدخل
  const name = str(formData, "name");
  return {
    name,
    phone: orNull(str(formData, "phone")),
    email: orNull(str(formData, "email")),
    languages: orNull(str(formData, "languages")),
    notes: orNull(str(formData, "notes")),
  };
}

export async function createGuide(formData: FormData) {
  await requireUser();
  const data = buildGuideData(formData);
  const created = await prisma.guide.create({ data });
  await logActivity("create", "Guide", created.name || "مرشد بلا اسم");
  revalidatePath("/guides");
  redirect("/guides");
}

export async function updateGuide(id: string, formData: FormData) {
  await requireUser();
  const data = buildGuideData(formData);
  await prisma.guide.update({ where: { id }, data });
  revalidatePath("/guides");
  redirect("/guides");
}

export async function deleteGuide(id: string) {
  await requireUser();
  // حذف مرشد له أوامر تكليف كان يُفرّغ خانة المكلَّف في تلك الأوامر بصمت
  // (تبقى الأوامر بلا اسم في القائمة وفي الـ PDF)، فنمنع الحذف ونشرح السبب.
  const assigned = await prisma.taskOrder.count({ where: { guideId: id } });
  if (assigned > 0) {
    redirect(
      withError(
        "/guides",
        `لا يمكن حذف هذا المرشد لوجود ${assigned} أمر تكليف صادر باسمه — احذف أوامر التكليف أولاً أو غيّر المكلَّف فيها`
      )
    );
  }
  const removed = await prisma.guide.delete({ where: { id } });
  await logActivity("delete", "Guide", removed.name || "مرشد بلا اسم");
  revalidatePath("/guides");
}
