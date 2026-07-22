"use server";

import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function str(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function orNull(value: string) {
  return value.length > 0 ? value : null;
}

// المرافقون: مصفوفتان متوازيتان comp_name / comp_passport، نتجاهل الصفوف بلا اسم
function buildCompanions(formData: FormData): { name: string; passport: string }[] {
  const names = formData.getAll("comp_name").map(String);
  const passports = formData.getAll("comp_passport").map(String);
  const out: { name: string; passport: string }[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = (names[i] ?? "").trim();
    if (!name) continue;
    out.push({ name, passport: (passports[i] ?? "").trim() });
  }
  return out;
}

function buildCustomerData(formData: FormData) {
  // كل الحقول اختيارية — لا نمنع الحفظ لو نقص أي بيان
  const companions = buildCompanions(formData);
  return {
    name: str(formData, "name"),
    phone: orNull(str(formData, "phone")),
    email: orNull(str(formData, "email")),
    passport: orNull(str(formData, "passport")),
    companions,
    notes: orNull(str(formData, "notes")),
  };
}

export async function createCustomer(formData: FormData) {
  const data = buildCustomerData(formData);
  const c = await prisma.customer.create({ data });
  await logActivity("create", "Customer", c.name);
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
