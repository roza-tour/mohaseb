export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { loadTripsById, tripProgramName } from "@/lib/safeRead";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { rowsToXlsx, xlsxResponseHeaders } from "@/lib/exportXlsx";
import { formatDate } from "@/lib/format";
import type { InvoiceItem } from "../actions";

export async function GET() {
  if (!(await auth())?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const invoices = await prisma.invoice.findMany({
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });
  const tripsById = await loadTripsById(invoices.map((i) => i.tripId));
  const rows = invoices.map((inv) => {
    const items = Array.isArray(inv.items) ? (inv.items as InvoiceItem[]) : [];
    const total = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0) - inv.discount;
    return [
      inv.invoiceNumber,
      inv.customer?.name ?? "",
      inv.tripId ? tripProgramName(tripsById.get(inv.tripId), "رحلة محذوفة") : "",
      formatDate(inv.docDate),
      total,
      inv.currency,
      inv.paid ? "مدفوعة" : "غير مدفوعة",
    ];
  });
  const buf = await rowsToXlsx("الفواتير", ["الرقم", "العميل", "الرحلة", "التاريخ", "الإجمالي", "العملة", "الحالة"], rows);
  return new NextResponse(new Uint8Array(buf), { headers: xlsxResponseHeaders("invoices.xlsx") });
}
