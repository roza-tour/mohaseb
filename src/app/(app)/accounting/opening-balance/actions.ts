"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const openingBalanceSchema = z.object({
  fiscalYear: z.coerce.number({ message: "السنة المالية مطلوبة" }).int(),
  itemName: z.string().trim().min(1, "اسم البند مطلوب"),
  itemType: z.enum(["ASSET", "LIABILITY", "EQUITY"], { message: "نوع البند مطلوب" }),
  amount: z.coerce.number({ message: "المبلغ مطلوب" }),
  notes: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : null)),
});

export async function createOpeningBalanceItem(formData: FormData) {
  const data = openingBalanceSchema.parse({
    fiscalYear: formData.get("fiscalYear") || undefined,
    itemName: formData.get("itemName"),
    itemType: formData.get("itemType"),
    amount: formData.get("amount") || undefined,
    notes: formData.get("notes"),
  });

  await prisma.openingBalance.create({ data });

  revalidatePath("/accounting/opening-balance");
  redirect(`/accounting/opening-balance?year=${data.fiscalYear}`);
}

export async function deleteOpeningBalanceItem(id: string) {
  await prisma.openingBalance.delete({ where: { id } });
  revalidatePath("/accounting/opening-balance");
}
