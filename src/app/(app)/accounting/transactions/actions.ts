"use server";

import { prisma } from "@/lib/prisma";
import { firstErrorMessage, withError } from "@/lib/formErrors";
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
  category: z.string().trim().optional().default(""),
  amount: z.coerce.number({ message: "المبلغ مطلوب" }).gt(0, "المبلغ يجب أن يكون أكبر من صفر"),
  currency: z.string().min(1).default("DZD"),
  date: z.coerce.date({ message: "التاريخ مطلوب" }),
  tripId: z.string().optional(),
  description: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : null)),
});

export async function createTransaction(formData: FormData) {
  const parsed = transactionSchema.safeParse({
    type: formData.get("type"),
    category: formData.get("category"),
    amount: formData.get("amount") || undefined,
    currency: formData.get("currency") || undefined,
    date: formData.get("date") || undefined,
    tripId: orUndefined(formData.get("tripId")),
    description: orNull(formData.get("description")),
  });
  if (!parsed.success) {
    redirect(withError("/accounting/transactions/new", firstErrorMessage(parsed.error)));
  }

  const { tripId, ...rest } = parsed.data;

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
