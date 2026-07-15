"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const nameSchema = z.string().trim().min(1, "الاسم مطلوب");

function str(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function orNull(value: string) {
  return value.length > 0 ? value : null;
}

function buildCustomerData(formData: FormData) {
  const name = nameSchema.parse(str(formData, "name"));
  return {
    name,
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
