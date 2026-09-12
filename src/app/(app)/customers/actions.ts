"use server";

import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
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
  // العميل المرتبط برحلات أو فواتير لا يمكن حذفه (قيد foreign key في قاعدة البيانات)،
  // وكان الحذف يُسقط الصفحة بخطأ 500 بالإنجليزية — نشرح السبب بالعربية بدل ذلك.
  const [trips, invoices] = await Promise.all([
    prisma.trip.count({ where: { customerId: id } }),
    prisma.invoice.count({ where: { customerId: id } }),
  ]);
  if (trips > 0) {
    redirect(
      withError(
        "/customers",
        `لا يمكن حذف هذا العميل لارتباطه بـ ${trips} رحلة — احذف رحلاته أولاً أو أبقِ بياناته للأرشيف`
      )
    );
  }
  const removed = await prisma.customer.findUnique({ where: { id }, select: { name: true } });
  await prisma.customer.delete({ where: { id } });
  await logActivity("delete", "Customer", removed?.name ?? "");
  if (invoices > 0) revalidatePath("/invoices");
  revalidatePath("/customers");
}
