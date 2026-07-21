"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildDocNumber } from "@/lib/documents";
import { firstErrorMessage, withError } from "@/lib/formErrors";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const paymentSchema = z.object({
  amount: z.coerce.number().positive("مبلغ الدفعة يجب أن يكون أكبر من صفر"),
  method: z.enum(["CASH", "BANK", "CHEQUE", "OTHER"]).default("CASH"),
  reference: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : null)),
  notes: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : null)),
  paidAt: z.coerce.date().optional(),
});

export async function createPayment(tripId: string, formData: FormData) {
  const parsed = paymentSchema.safeParse({
    amount: formData.get("amount"),
    method: formData.get("method") || undefined,
    reference: formData.get("reference") ?? undefined,
    notes: formData.get("notes") ?? undefined,
    paidAt: formData.get("paidAt") || undefined,
  });
  if (!parsed.success) redirect(withError(`/trips/${tripId}`, firstErrorMessage(parsed.error)));

  // تاريخ الدفعة اختياري — إن تُرك فارغاً نضع تاريخ اليوم
  const paidAt = parsed.data.paidAt ?? new Date();
  const year = paidAt.getFullYear();
  const countThisYear = await prisma.payment.count({
    where: {
      paidAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) },
    },
  });

  await prisma.payment.create({
    data: {
      ...parsed.data,
      paidAt,
      tripId,
      receiptNumber: buildDocNumber(year, countThisYear),
    },
  });
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/");
}

export async function deletePayment(tripId: string, id: string) {
  await prisma.payment.delete({ where: { id } });
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/");
}
