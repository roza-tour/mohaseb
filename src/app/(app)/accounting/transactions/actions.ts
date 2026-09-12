"use server";

import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/authz";
import { firstErrorMessage, withError } from "@/lib/formErrors";
import { logActivity } from "@/lib/activity";
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
  await requireUser();
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

// تعديل قيد محاسبي. القيود المولَّدة تلقائياً من دعوة أو ملف فيزا لا تُعدَّل هنا
// حتى لا تختلف عن مستندها — تُعدَّل من صفحة المستند نفسه فيُزامَن القيد تلقائياً.
export async function updateTransaction(id: string, formData: FormData) {
  await requireUser();
  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing) redirect("/accounting/transactions");
  const back = `/accounting/transactions/${id}`;

  if (existing.invitationId || existing.visaApplicationId) {
    redirect(
      withError(
        back,
        "هذا القيد مرتبط بمستند (دعوة أو فيزا) — عدّل المستند نفسه ليتحدَّث القيد تلقائياً"
      )
    );
  }

  const parsed = transactionSchema.safeParse({
    type: formData.get("type"),
    category: formData.get("category"),
    amount: formData.get("amount") || undefined,
    currency: formData.get("currency") || undefined,
    date: formData.get("date") || undefined,
    tripId: orUndefined(formData.get("tripId")),
    description: orNull(formData.get("description")),
  });
  if (!parsed.success) redirect(withError(back, firstErrorMessage(parsed.error)));

  const { tripId, ...rest } = parsed.data;
  await prisma.transaction.update({
    where: { id },
    data: { ...rest, tripId: tripId ?? null },
  });

  await logActivity("update", "Transaction", `تعديل قيد ${rest.category || ""}`.trim());
  revalidatePath("/accounting/transactions");
  redirect("/accounting/transactions");
}

export async function deleteTransaction(id: string) {
  await requireAdmin("/accounting/transactions");
  await prisma.transaction.delete({ where: { id } });
  revalidatePath("/accounting/transactions");
}
