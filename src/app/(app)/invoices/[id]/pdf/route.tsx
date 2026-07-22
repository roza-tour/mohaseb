export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { pickLang } from "@/lib/pdf/docLang";
import { renderInvoicePdf } from "./render";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const lang = pickLang(req.url, "ar");
  const result = await renderInvoicePdf(id, lang);
  if (!result) return NextResponse.json({ error: "not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${result.invoiceNumber.replace(/[^0-9A-Za-z]/g, "-")}-${lang}.pdf"`,
    },
  });
}
