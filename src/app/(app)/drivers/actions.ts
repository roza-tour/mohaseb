"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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
  const data = buildDriverData(formData);
  await prisma.driver.create({ data });
  revalidatePath("/drivers");
  redirect("/drivers");
}

export async function updateDriver(id: string, formData: FormData) {
  const data = buildDriverData(formData);
  await prisma.driver.update({ where: { id }, data });
  revalidatePath("/drivers");
  redirect("/drivers");
}

export async function deleteDriver(id: string) {
  await prisma.driver.delete({ where: { id } });
  revalidatePath("/drivers");
}
