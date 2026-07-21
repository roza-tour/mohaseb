export const runtime = "nodejs";

// تقديم مرفقات الرحلات (جوازات، تذاكر...) عبر مسار محمي بتسجيل الدخول فقط —
// الملفات تُخزَّن خارج مجلد public حتى لا تكون متاحة للعموم على الإنترنت.
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const att = await prisma.attachment.findUnique({ where: { id } });
  if (!att) return NextResponse.json({ error: "not found" }, { status: 404 });

  // المسارات الجديدة = اسم الملف فقط (داخل private_uploads)، والقديمة = /uploads/... (توافق خلفي)
  const filePath = att.path.startsWith("/")
    ? path.join(process.cwd(), "public", att.path.replace(/^\//, ""))
    : path.join(process.cwd(), "private_uploads", "attachments", att.path);

  // حماية إضافية ضد الخروج من المجلد
  const base = path.join(process.cwd(), "private_uploads", "attachments");
  if (!att.path.startsWith("/") && !path.resolve(filePath).startsWith(path.resolve(base))) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  let data: Buffer;
  try {
    data = await fs.promises.readFile(filePath);
  } catch {
    return NextResponse.json({ error: "file missing" }, { status: 404 });
  }

  const ext = (att.path.split(".").pop() || "").toLowerCase();
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${att.id}.${ext || "bin"}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
