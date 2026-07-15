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

function buildGuideData(formData: FormData) {
  const name = nameSchema.parse(str(formData, "name"));
  return {
    name,
    phone: orNull(str(formData, "phone")),
    email: orNull(str(formData, "email")),
    languages: orNull(str(formData, "languages")),
    notes: orNull(str(formData, "notes")),
  };
}

export async function createGuide(formData: FormData) {
  const data = buildGuideData(formData);
  await prisma.guide.create({ data });
  revalidatePath("/guides");
  redirect("/guides");
}

export async function updateGuide(id: string, formData: FormData) {
  const data = buildGuideData(formData);
  await prisma.guide.update({ where: { id }, data });
  revalidatePath("/guides");
  redirect("/guides");
}

export async function deleteGuide(id: string) {
  await prisma.guide.delete({ where: { id } });
  revalidatePath("/guides");
}
