export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildVisaExcel } from "@/lib/visa";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const app = await prisma.visaApplication.findUnique({
    where: { id },
    include: { travelers: true },
  });
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const buffer = await buildVisaExcel(app, settings);
  const safeRef = app.refNumber.replace(/[^0-9A-Za-z]/g, "-");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="visa-liste-${safeRef}.xlsx"`,
    },
  });
}
