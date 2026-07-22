export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { rowsToXlsx, xlsxResponseHeaders } from "@/lib/exportXlsx";
import { formatDate } from "@/lib/format";

export async function GET() {
  if (!(await auth())?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const customers = await prisma.customer.findMany({ orderBy: { name: "asc" } });
  const rows = customers.map((c) => [
    c.name,
    c.phone ?? "",
    c.email ?? "",
    c.passport ?? "",
    Array.isArray(c.companions) ? c.companions.length : 0,
    formatDate(c.createdAt),
  ]);
  const buf = await rowsToXlsx("العملاء", ["الاسم", "الهاتف", "البريد", "رقم الجواز", "عدد المرافقين", "تاريخ الإضافة"], rows);
  return new NextResponse(new Uint8Array(buf), { headers: xlsxResponseHeaders("customers.xlsx") });
}
