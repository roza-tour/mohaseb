export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { renderDocumentPdf } from "./render";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await renderDocumentPdf(id);
  if (!result) return NextResponse.json({ error: "not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      // لا نسخ مخزّنة: بعد أي تعديل يظهر الملف بآخر بياناته
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="document-${result.docNumber.replace(/[^0-9A-Za-z]/g, "-")}.pdf"`,
    },
  });
}
