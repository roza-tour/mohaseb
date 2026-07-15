export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Document as PdfDocument, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { LetterheadPage, registerArabicFonts, loadPublicImage } from "@/lib/pdf/letterhead";

function formatDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

registerArabicFonts();

const styles = StyleSheet.create({
  metaRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  metaText: {
    fontSize: 9,
    color: "#475569",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 18,
  },
  paragraph: {
    fontSize: 11.5,
    lineHeight: 1.7,
    textAlign: "right",
    marginBottom: 10,
  },
  signRow: {
    flexDirection: "row-reverse",
    gap: 16,
    marginTop: 28,
  },
  signBox: {
    flex: 1,
    border: "1px solid #cbd5e1",
    borderRadius: 4,
    padding: 10,
    minHeight: 96,
    alignItems: "center",
  },
  signLabel: {
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
    fontSize: 10,
  },
  stampImage: {
    width: 80,
    height: 80,
    objectFit: "contain",
  },
});

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const stampBuffer = doc.showStamp ? loadPublicImage(settings?.stampPath) : null;

  // كل سطر غير فارغ فقرة مستقلة حتى يحافظ النص الحر على تنسيقه
  const paragraphs = doc.body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const pdf = (
    <PdfDocument>
      <LetterheadPage settings={settings}>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>الرقم: {doc.docNumber}</Text>
          <Text style={styles.metaText}>التاريخ: {formatDate(doc.docDate)}</Text>
        </View>

        <Text style={styles.title}>{doc.title}</Text>

        {paragraphs.map((p, i) => (
          <Text key={i} style={styles.paragraph}>
            {p}
          </Text>
        ))}

        {doc.showStamp ? (
          <View style={styles.signRow} wrap={false}>
            <View style={styles.signBox}>
              <Text style={styles.signLabel}>التوقيع</Text>
            </View>
            <View style={styles.signBox}>
              <Text style={styles.signLabel}>ختم الوكالة</Text>
              {stampBuffer ? (
                // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image, not an HTML img
                <Image src={stampBuffer} style={styles.stampImage} />
              ) : null}
            </View>
          </View>
        ) : null}
      </LetterheadPage>
    </PdfDocument>
  );

  const buffer = await renderToBuffer(pdf);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="document-${doc.docNumber.replace("/", "-")}.pdf"`,
    },
  });
}
