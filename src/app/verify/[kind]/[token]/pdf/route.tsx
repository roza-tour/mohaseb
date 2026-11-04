export const runtime = "nodejs";

// المستند نفسه (PDF) لمن مسح رمز QR — يُولَّد لحظة الطلب فيعكس آخر تعديل.
// عام بلا تسجيل دخول، لكنه لا يُفتح إلا بالرمز السري المطبوع في المستند.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pickLang } from "@/lib/pdf/docLang";
import { renderInvoicePdf } from "@/app/(app)/invoices/[id]/pdf/render";
import { renderInvitationPdf } from "@/app/(app)/invitations/[id]/pdf/render";
import { renderReceiptPdf } from "@/app/(app)/payments/[id]/pdf/render";
import { renderTaskOrderPdf } from "@/app/(app)/task-orders/[id]/pdf/render";

function pdf(buffer: Buffer, name: string) {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${name.replace(/[^0-9A-Za-z.-]/g, "-")}"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

export async function GET(req: Request, context: { params: Promise<{ kind: string; token: string }> }) {
  const { kind, token } = await context.params;
  const notFound = () => NextResponse.json({ error: "not found" }, { status: 404 });
  if (!token || token.length < 16) return notFound();

  if (kind === "invoice") {
    const inv = await prisma.invoice.findUnique({ where: { publicToken: token }, select: { id: true } });
    if (!inv) return notFound();
    const lang = pickLang(req.url, "fr");
    const result = await renderInvoicePdf(inv.id, lang);
    if (!result) return notFound();
    return pdf(result.buffer, `invoice-${result.invoiceNumber}-${lang}.pdf`);
  }

  if (kind === "invitation") {
    const inv = await prisma.invitation.findUnique({ where: { publicToken: token }, select: { id: true } });
    if (!inv) return notFound();
    const result = await renderInvitationPdf(inv.id);
    if (!result) return notFound();
    return pdf(result.buffer, `invitation-${result.refNumber}.pdf`);
  }

  // سند القبض وأمر التكليف: بالفرنسية أو العربية فقط
  const lang2: "ar" | "fr" = pickLang(req.url, "fr") === "ar" ? "ar" : "fr";

  if (kind === "receipt") {
    const pay = await prisma.payment.findUnique({ where: { publicToken: token }, select: { id: true } });
    if (!pay) return notFound();
    const result = await renderReceiptPdf(pay.id, lang2);
    if (!result) return notFound();
    return pdf(result.buffer, `receipt-${result.receiptNumber}-${lang2}.pdf`);
  }

  if (kind === "task-order") {
    const order = await prisma.taskOrder.findUnique({ where: { publicToken: token }, select: { id: true } });
    if (!order) return notFound();
    const result = await renderTaskOrderPdf(order.id, lang2);
    if (!result) return notFound();
    return pdf(result.buffer, `task-order-${result.ref}-${lang2}.pdf`);
  }

  return notFound();
}
