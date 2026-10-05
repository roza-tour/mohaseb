export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildVisaWord } from "@/lib/visa";
import { loadPublicImage } from "@/lib/pdf/letterhead";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const app = await prisma.visaApplication.findUnique({
    where: { id },
    include: { travelers: true },
  });
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });

  // ختم الوكالة يُدرج أسفل البرنامج (من إعدادات الوكالة)
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const stamp = loadPublicImage(settings?.stampPath);
  const buffer = buildVisaWord(app, stamp);
  const safeRef = app.refNumber.replace(/[^0-9A-Za-z]/g, "-");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="programme-${safeRef}.docx"`,
    },
  });
}
