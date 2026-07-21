export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Document, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { LetterheadPage, registerArabicFonts, loadPublicImage } from "@/lib/pdf/letterhead";
import { MixedText } from "@/lib/pdf/MixedText";
import { invitationBody, type InvLang, type Person } from "@/lib/invitation";
import { makeQrPng, docQrText } from "@/lib/qr";

registerArabicFonts();

function fmt(date: Date | null | undefined) {
  if (!date) return "";
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${date.getUTCFullYear()}`;
}

const styles = StyleSheet.create({
  meta: { fontSize: 9, color: "#475569", marginBottom: 14 },
  title: { fontSize: 17, fontWeight: "bold", color: "#1f3864", marginBottom: 16 },
  h1: { fontSize: 14, fontWeight: "bold", color: "#1f3864", marginBottom: 8 },
  para: { marginBottom: 8, fontSize: 11.5 },
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const inv = await prisma.invitation.findUnique({ where: { id }, include: { program: true } });
  if (!inv) return NextResponse.json({ error: "not found" }, { status: 404 });

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const stamp = loadPublicImage(settings?.stampPath);
  const qr = await makeQrPng(
    docQrText({ agency: settings?.agencyName, type: "Invitation", number: inv.refNumber, date: fmt(inv.docDate), website: settings?.agencyWebsite })
  );

  const lang = (["ar", "fr", "en"].includes(inv.language) ? inv.language : "fr") as InvLang;
  const rtl = lang === "ar";
  const align = rtl ? ("right" as const) : ("left" as const);
  const baseDir = rtl ? ("auto" as const) : ("ltr" as const);

  const people = (Array.isArray(inv.people) ? inv.people : []) as Person[];
  const built = invitationBody(lang, {
    consulate: inv.consulate || "",
    agency: settings?.agencyName?.trim() || "ROZATOUR",
    people,
    program: inv.program?.name || "",
    arrival: fmt(inv.arrivalDate),
    departure: fmt(inv.departureDate),
    today: fmt(inv.docDate),
  });

  const itinerary = (inv.itinerary || inv.program?.itinerary || "").trim();

  const renderLines = (text: string) =>
    text
      .split(/\r?\n/)
      .map((l) => l.replace(/\s+$/, ""))
      .map((line, i) =>
        line.trim() === "" ? (
          <View key={i} style={{ height: 6 }} />
        ) : (
          <MixedText
            key={i}
            text={line}
            size={11.5}
            align={align}
            baseDir={baseDir}
            containerStyle={{ marginBottom: 2 }}
          />
        )
      );

  const doc = (
    <Document>
      <LetterheadPage settings={settings} stamp={stamp} qr={qr}>
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", justifyContent: "space-between" }}>
          <Text style={styles.meta}>N° {inv.refNumber}</Text>
          <Text style={styles.meta}>{fmt(inv.docDate)}</Text>
        </View>
        <MixedText text={built.title} size={17} align="center" baseDir={baseDir} style={{ fontWeight: "bold", color: "#1f3864" }} containerStyle={{ marginBottom: 16 }} />
        {renderLines(built.page1)}
      </LetterheadPage>

      <LetterheadPage settings={settings} stamp={stamp} qr={qr}>
        <MixedText text={built.itineraryTitle} size={14} align={align} baseDir={baseDir} style={{ fontWeight: "bold", color: "#1f3864" }} containerStyle={{ marginBottom: 10 }} />
        {itinerary ? renderLines(itinerary) : <Text style={{ fontSize: 10.5, color: "#94a3b8" }}>—</Text>}
      </LetterheadPage>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  const safeRef = inv.refNumber.replace(/[^0-9A-Za-z]/g, "-");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invitation-${safeRef}-${lang}.pdf"`,
    },
  });
}
