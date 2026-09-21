export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { loadTripsById, tripLabel } from "@/lib/safeRead";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { rowsToXlsx, xlsxResponseHeaders } from "@/lib/exportXlsx";
import { formatDate } from "@/lib/format";

export async function GET() {
  if (!(await auth())?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const txs = await prisma.transaction.findMany({
    orderBy: { date: "desc" },
  });
  const tripsById = await loadTripsById(txs.map((t) => t.tripId));
  const rows = txs.map((t) => [
    formatDate(t.date),
    t.type === "INCOME" ? "إيراد" : "مصروف",
    t.category,
    t.amount,
    t.currency,
    t.tripId ? tripLabel(tripsById.get(t.tripId), "رحلة محذوفة") : "",
    t.description ?? "",
  ]);
  const buf = await rowsToXlsx("القيود", ["التاريخ", "النوع", "التصنيف", "المبلغ", "العملة", "الرحلة", "الوصف"], rows);
  return new NextResponse(new Uint8Array(buf), { headers: xlsxResponseHeaders("transactions.xlsx") });
}
