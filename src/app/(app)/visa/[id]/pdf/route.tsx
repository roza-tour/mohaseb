export const runtime = "nodejs";

import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { registerArabicFonts, loadPublicImage } from "@/lib/pdf/letterhead";
import { MixedText } from "@/lib/pdf/MixedText";
import { fmtFr } from "@/lib/visa";

registerArabicFonts();

// شعار الدولة العريض (ترويسة وزارة السياحة) لصدر البرنامج
function loadBanner(): Buffer | null {
  try {
    return fs.readFileSync(path.join(process.cwd(), "templates", "assets", "visa-banner.png"));
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  page: { fontFamily: "Tajawal", fontSize: 11, color: "#0f172a", paddingTop: 24, paddingHorizontal: 44, paddingBottom: 40 },
  banner: { width: "100%", objectFit: "contain", marginBottom: 6 },
  hr: { borderBottom: "1px solid #94a3b8", marginBottom: 14 },
  title: { fontSize: 15, fontWeight: "bold", textAlign: "center", marginBottom: 14, color: "#1f3864" },
  infoBox: { border: "1px solid #cbd5e1", borderRadius: 4, marginBottom: 16 },
  infoRow: { flexDirection: "row", borderBottom: "1px solid #e2e8f0" },
  infoLabel: { width: 180, padding: 6, fontSize: 10.5, fontWeight: "bold", backgroundColor: "#f1f5f9", color: "#334155" },
  infoValue: { flex: 1, padding: 6, fontSize: 10.5 },
  progTitle: { fontSize: 12, fontWeight: "bold", marginBottom: 8, color: "#1f3864" },
  progLine: { marginBottom: 3 },
  stampWrap: { marginTop: 30, alignItems: "flex-end" },
  stampBox: { width: 180, border: "1px solid #cbd5e1", borderRadius: 4, padding: 10, minHeight: 100, alignItems: "center" },
  stampLabel: { fontWeight: "bold", marginBottom: 8, textAlign: "center", fontSize: 10 },
  stampImage: { width: 82, height: 82, objectFit: "contain" },
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const app = await prisma.visaApplication.findUnique({ where: { id }, include: { travelers: true } });
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const banner = loadBanner();
  const stampBuffer = loadPublicImage(settings?.stampPath);

  const nights = Math.max(Math.round((app.departureDate.getTime() - app.arrivalDate.getTime()) / 86400000), 0);
  const info: [string, string][] = [
    ["Wilaya", app.wilaya || ""],
    ["Date d'arrivée", fmtFr(app.arrivalDate)],
    ["Date de départ", fmtFr(app.departureDate)],
    ["Wilayas concernées", app.wilayasConcernees || ""],
    ["Nombre de touristes", String(app.travelers.length)],
    ["Durée", `${nights + 1} jours / ${nights} nuits`],
  ];
  const progLines = (app.programDetail || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        {banner ? (
          // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image
          <Image src={banner} style={styles.banner} />
        ) : null}
        <View style={styles.hr} />

        <Text style={styles.title}>Programme détaillé</Text>

        <View style={styles.infoBox}>
          {info.map(([label, value], i) => (
            <View key={i} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{label}</Text>
              <View style={styles.infoValue}>
                <MixedText text={value} size={10.5} align="left" baseDir="ltr" />
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.progTitle}>Programme jour par jour</Text>
        {progLines.length === 0 ? (
          <Text style={{ fontSize: 10.5, color: "#94a3b8" }}>—</Text>
        ) : (
          progLines.map((line, i) => (
            <MixedText key={i} text={line} size={11} align="left" baseDir="ltr" containerStyle={styles.progLine} />
          ))
        )}

        <View style={styles.stampWrap} wrap={false}>
          <View style={styles.stampBox}>
            <Text style={styles.stampLabel}>Cachet de l&apos;agence</Text>
            {stampBuffer ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image
              <Image src={stampBuffer} style={styles.stampImage} />
            ) : null}
          </View>
        </View>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  const safeRef = app.refNumber.replace(/[^0-9A-Za-z]/g, "-");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="programme-${safeRef}.pdf"`,
    },
  });
}
