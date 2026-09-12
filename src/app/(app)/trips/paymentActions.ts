"use server";

import { z } from "zod";
import { requireUser, requireAdmin } from "@/lib/authz";
import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/prisma";
import { nextDocNumber } from "@/lib/docNumbers";
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
  await requireUser();
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
  const receiptNumber = await nextDocNumber("receipt", paidAt.getFullYear());

  await prisma.payment.create({
    data: {
      ...parsed.data,
      paidAt,
      tripId,
      receiptNumber,
    },
  });
  await logActivity("create", "Payment", `سند قبض ${receiptNumber}`);
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/");
}

// حذف سند قبض = حذف سجل مالي — للمدير وحده
export async function deletePayment(tripId: string, id: string) {
  await requireAdmin(`/trips/${tripId}`);
  const removed = await prisma.payment.delete({ where: { id } });
  await logActivity("delete", "Payment", `حذف سند قبض ${removed.receiptNumber}`);
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/");
}
