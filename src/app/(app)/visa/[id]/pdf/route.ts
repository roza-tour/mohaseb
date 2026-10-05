export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildVisaWord } from "@/lib/visa";
import { loadPublicImage } from "@/lib/pdf/letterhead";
import { docxToPdf, canConvertToPdf } from "@/lib/docxToPdf";

// البرنامج المفصّل بصيغة PDF — وهو **ملف الوزارة نفسه** مطبوعاً PDF،
// لا مستنداً أعدنا رسمه. فإن لم تتوفر أداة التحويل على الخادم لا نُخرج
// بديلاً يشبه النموذج الرسمي، بل نوجّه إلى تنزيل ملف Word كما هو.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const app = await prisma.visaApplication.findUnique({
    where: { id },
    include: { travelers: true },
  });
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });

  const safeRef = app.refNumber.replace(/[^0-9A-Za-z]/g, "-");

  if (!canConvertToPdf()) {
    return new NextResponse(
      `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
       <title>تحويل PDF غير متاح</title></head>
       <body style="font-family:system-ui,Arial;background:#f8fafc;color:#0f172a;padding:40px;line-height:1.9">
       <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:28px">
       <h2 style="margin:0 0 12px">تحويل PDF غير متاح على هذا الخادم</h2>
       <p>برنامج الفيزا نموذج رسمي لمديرية السياحة، ولا نُخرجه إلا من ملف الوزارة نفسه —
       لا نعيد رسمه حتى لا يكون المستند المقدَّم مختلفاً عن النموذج الرسمي.</p>
       <p>حمّل ملف <b>Word</b> ثم احفظه PDF من البرنامج نفسه
       (<span dir="ltr">File → Save as → PDF</span>): الناتج هو نموذج الوزارة حرفياً.</p>
       <p style="margin-top:20px">
       <a href="/visa/${id}/word" style="display:inline-block;background:#0284c7;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px">تنزيل ملف Word</a>
       </p>
       </div></body></html>`,
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  // ختم الوكالة يُدرج في الملف قبل التحويل (كما في نسخة Word)
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const stamp = loadPublicImage(settings?.stampPath);
  const docx = buildVisaWord(app, stamp);
  const pdf = await docxToPdf(docx);
  if (!pdf) {
    return NextResponse.json(
      { error: "تعذّر تحويل الملف إلى PDF — حمّل ملف Word واحفظه PDF من البرنامج" },
      { status: 200 }
    );
  }

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="programme-${safeRef}.pdf"`,
    },
  });
}
