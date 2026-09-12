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

function buildHotelData(formData: FormData) {
  // الاسم اختياري — يُحفظ فارغاً إن لم يُدخل
  const name = str(formData, "name");
  return {
    name,
    city: orNull(str(formData, "city")),
    phone: orNull(str(formData, "phone")),
    email: orNull(str(formData, "email")),
    contactPerson: orNull(str(formData, "contactPerson")),
    notes: orNull(str(formData, "notes")),
  };
}

export async function createHotel(formData: FormData) {
  await requireUser();
  const data = buildHotelData(formData);
  const created = await prisma.hotel.create({ data });
  await logActivity("create", "Hotel", created.name || "فندق بلا اسم");
  revalidatePath("/hotels");
  redirect("/hotels");
}

export async function updateHotel(id: string, formData: FormData) {
  await requireUser();
  const data = buildHotelData(formData);
  await prisma.hotel.update({ where: { id }, data });
  revalidatePath("/hotels");
  redirect("/hotels");
}

export async function deleteHotel(id: string) {
  await requireUser();
  // الفندق المرتبط بحجوزات لا يمكن حذفه (قيد foreign key) — كان يُسقط الصفحة بخطأ 500
  const bookings = await prisma.hotelBooking.count({ where: { hotelId: id } });
  if (bookings > 0) {
    redirect(
      withError(
        "/hotels",
        `لا يمكن حذف هذا الفندق لوجود ${bookings} حجز مرتبط به — احذف الحجوزات أولاً أو أبقِ الفندق في القائمة`
      )
    );
  }
  const removed = await prisma.hotel.delete({ where: { id } });
  await logActivity("delete", "Hotel", removed.name || "فندق بلا اسم");
  revalidatePath("/hotels");
}
