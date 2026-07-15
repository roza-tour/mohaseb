"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

function orUndefined(value: FormDataEntryValue | null) {
  const s = typeof value === "string" ? value.trim() : "";
  return s.length > 0 ? s : undefined;
}

function orNull(value: FormDataEntryValue | null) {
  const s = typeof value === "string" ? value.trim() : "";
  return s.length > 0 ? s : null;
}

const transactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"], { message: "نوع القيد مطلوب" }),
  category: z.string().trim().min(1, "التصنيف مطلوب"),
  amount: z.coerce.number({ message: "المبلغ مطلوب" }).gt(0, "المبلغ يجب أن يكون أكبر من صفر"),
  currency: z.string().min(1).default("JOD"),
  date: z.coerce.date({ message: "التاريخ مطلوب" }),
  tripId: z.string().optional(),
  description: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : null)),
});

export async function createTransaction(formData: FormData) {
  const data = transactionSchema.parse({
    type: formData.get("type"),
    category: formData.get("category"),
    amount: formData.get("amount") || undefined,
    currency: formData.get("currency") || undefined,
    date: formData.get("date") || undefined,
    tripId: orUndefined(formData.get("tripId")),
    description: orNull(formData.get("description")),
  });

  const { tripId, ...rest } = data;

  await prisma.transaction.create({
    data: {
      ...rest,
      tripId: tripId ?? null,
    },
  });

  revalidatePath("/accounting/transactions");
  redirect("/accounting/transactions");
}

export async function deleteTransaction(id: string) {
  await prisma.transaction.delete({ where: { id } });
  revalidatePath("/accounting/transactions");
}
