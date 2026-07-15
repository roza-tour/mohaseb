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

function buildHotelData(formData: FormData) {
  const name = nameSchema.parse(str(formData, "name"));
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
  const data = buildHotelData(formData);
  await prisma.hotel.create({ data });
  revalidatePath("/hotels");
  redirect("/hotels");
}

export async function updateHotel(id: string, formData: FormData) {
  const data = buildHotelData(formData);
  await prisma.hotel.update({ where: { id }, data });
  revalidatePath("/hotels");
  redirect("/hotels");
}

export async function deleteHotel(id: string) {
  await prisma.hotel.delete({ where: { id } });
  revalidatePath("/hotels");
}
