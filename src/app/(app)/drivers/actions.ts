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

function buildDriverData(formData: FormData) {
  // الاسم اختياري — يُحفظ فارغاً إن لم يُدخل
  const name = str(formData, "name");
  return {
    name,
    phone: orNull(str(formData, "phone")),
    email: orNull(str(formData, "email")),
    vehicleInfo: orNull(str(formData, "vehicleInfo")),
    notes: orNull(str(formData, "notes")),
  };
}

export async function createDriver(formData: FormData) {
  await requireUser();
  const data = buildDriverData(formData);
  const created = await prisma.driver.create({ data });
  await logActivity("create", "Driver", created.name || "سائق بلا اسم");
  revalidatePath("/drivers");
  redirect("/drivers");
}

export async function updateDriver(id: string, formData: FormData) {
  await requireUser();
  const data = buildDriverData(formData);
  await prisma.driver.update({ where: { id }, data });
  revalidatePath("/drivers");
  redirect("/drivers");
}

export async function deleteDriver(id: string) {
  await requireUser();
  // نفس منطق المرشدين: لا نترك أوامر تكليف بلا مكلَّف
  const assigned = await prisma.taskOrder.count({ where: { driverId: id } });
  if (assigned > 0) {
    redirect(
      withError(
        "/drivers",
        `لا يمكن حذف هذا السائق لوجود ${assigned} أمر تكليف صادر باسمه — احذف أوامر التكليف أولاً أو غيّر المكلَّف فيها`
      )
    );
  }
  const removed = await prisma.driver.delete({ where: { id } });
  await logActivity("delete", "Driver", removed.name || "سائق بلا اسم");
  revalidatePath("/drivers");
}
