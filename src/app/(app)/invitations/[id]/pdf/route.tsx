export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { renderInvitationPdf } from "./render";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const result = await renderInvitationPdf(id);
  if (!result) return NextResponse.json({ error: "not found" }, { status: 404 });

  const safeRef = result.refNumber.replace(/[^0-9A-Za-z]/g, "-");
  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invitation-${safeRef}-${result.lang}.pdf"`,
    },
  });
}
