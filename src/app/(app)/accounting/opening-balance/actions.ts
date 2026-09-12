"use server";

import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/authz";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const openingBalanceSchema = z.object({
  fiscalYear: z.coerce.number().int().default(() => new Date().getFullYear()),
  itemName: z.string().trim().optional().default(""),
  itemType: z.enum(["ASSET", "LIABILITY", "EQUITY"]).default("ASSET"),
  amount: z.coerce.number().default(0),
  notes: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : null)),
});

export async function createOpeningBalanceItem(formData: FormData) {
  await requireUser();
  const data = openingBalanceSchema.parse({
    fiscalYear: formData.get("fiscalYear") || undefined,
    itemName: formData.get("itemName"),
    itemType: formData.get("itemType") || undefined,
    amount: formData.get("amount") || undefined,
    notes: formData.get("notes"),
  });

  await prisma.openingBalance.create({ data });

  revalidatePath("/accounting/opening-balance");
  redirect(`/accounting/opening-balance?year=${data.fiscalYear}`);
}

export async function updateOpeningBalanceItem(id: string, formData: FormData) {
  await requireUser();
  const data = openingBalanceSchema.parse({
    fiscalYear: formData.get("fiscalYear") || undefined,
    itemName: formData.get("itemName"),
    itemType: formData.get("itemType") || undefined,
    amount: formData.get("amount") || undefined,
    notes: formData.get("notes"),
  });

  await prisma.openingBalance.update({ where: { id }, data });

  revalidatePath("/accounting/opening-balance");
  redirect(`/accounting/opening-balance?year=${data.fiscalYear}`);
}

export async function deleteOpeningBalanceItem(id: string) {
  await requireAdmin("/accounting/opening-balance");
  await prisma.openingBalance.delete({ where: { id } });
  revalidatePath("/accounting/opening-balance");
}
