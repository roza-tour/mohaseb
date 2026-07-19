"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildDocNumber } from "@/lib/documents";
import { firstErrorMessage, withError } from "@/lib/formErrors";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const invoiceSchema = z.object({
  tripId: z.string().optional(),
  customerId: z.string().optional(),
  currency: z.string().min(1).default("DZD"),
  discount: z.coerce.number().min(0).default(0),
  notes: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : null)),
  showStamp: z.boolean(),
  docDate: z.coerce.date({ message: "تاريخ الفاتورة مطلوب" }),
});

export type InvoiceItem = { description: string; qty: number; unitPrice: number };

export async function createInvoice(formData: FormData) {
  const parsed = invoiceSchema.safeParse({
    tripId: formData.get("tripId") || undefined,
    customerId: formData.get("customerId") || undefined,
    currency: formData.get("currency") || undefined,
    discount: formData.get("discount") || undefined,
    notes: formData.get("notes") ?? undefined,
    showStamp: formData.get("showStamp") === "on",
    docDate: formData.get("docDate") || undefined,
  });
  if (!parsed.success) redirect(withError("/invoices/new", firstErrorMessage(parsed.error)));

  // بنود الفاتورة من الحقول المتكررة
  const descs = formData.getAll("itemDesc").map(String);
  const qtys = formData.getAll("itemQty").map(Number);
  const prices = formData.getAll("itemPrice").map(Number);
  const items: InvoiceItem[] = [];
  for (let i = 0; i < descs.length; i++) {
    const description = descs[i]?.trim();
    const qty = qtys[i];
    const unitPrice = prices[i];
    if (!description) continue;
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      redirect(withError("/invoices/new", "تأكد من صحة الكمية والسعر في كل بنود الفاتورة"));
    }
    items.push({ description, qty, unitPrice });
  }
  if (items.length === 0) {
    redirect(withError("/invoices/new", "أضف بنداً واحداً على الأقل للفاتورة"));
  }

  const subtotal = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  if (parsed.data.discount > subtotal) {
    redirect(withError("/invoices/new", "الخصم لا يمكن أن يتجاوز مجموع البنود"));
  }

  const year = parsed.data.docDate.getFullYear();
  const countThisYear = await prisma.invoice.count({
    where: { docDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
  });

  const created = await prisma.invoice.create({
    data: {
      invoiceNumber: buildDocNumber(year, countThisYear),
      tripId: parsed.data.tripId || null,
      customerId: parsed.data.customerId || null,
      currency: parsed.data.currency,
      discount: parsed.data.discount,
      notes: parsed.data.notes,
      showStamp: parsed.data.showStamp,
      docDate: parsed.data.docDate,
      items,
    },
  });

  redirect(`/invoices/${created.id}/pdf`);
}

export async function deleteInvoice(id: string) {
  await prisma.invoice.delete({ where: { id } });
  revalidatePath("/invoices");
}
