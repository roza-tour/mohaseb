export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { pickLang } from "@/lib/pdf/docLang";
import { renderTaskOrderPdf } from "./render";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  // أمر التكليف يُصدر بالعربية أو الفرنسية فقط؛ طلب الإنجليزية يُخدَم بالفرنسية
  const picked = pickLang(req.url, "ar");
  const lang: "ar" | "fr" = picked === "en" ? "fr" : picked;

  const result = await renderTaskOrderPdf(id, lang);
  if (!result) return NextResponse.json({ error: "not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="task-order-${result.ref.replace(/[^0-9A-Za-z]/g, "-")}-${lang}.pdf"`,
    },
  });
}
