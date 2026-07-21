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

function buildCustomerData(formData: FormData) {
  // كل الحقول اختيارية — لا نمنع الحفظ لو نقص أي بيان
  return {
    name: str(formData, "name"),
    phone: orNull(str(formData, "phone")),
    email: orNull(str(formData, "email")),
    notes: orNull(str(formData, "notes")),
  };
}

export async function createCustomer(formData: FormData) {
  const data = buildCustomerData(formData);
  await prisma.customer.create({ data });
  revalidatePath("/customers");
  redirect("/customers");
}

export async function updateCustomer(id: string, formData: FormData) {
  const data = buildCustomerData(formData);
  await prisma.customer.update({ where: { id }, data });
  revalidatePath("/customers");
  redirect("/customers");
}

export async function deleteCustomer(id: string) {
  await prisma.customer.delete({ where: { id } });
  revalidatePath("/customers");
}
