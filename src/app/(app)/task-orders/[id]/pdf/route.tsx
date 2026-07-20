export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Document, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { LetterheadPage, registerArabicFonts, loadPublicImage } from "@/lib/pdf/letterhead";
import { MixedText } from "@/lib/pdf/MixedText";

// react-pdf/pdfkit doesn't implement the Unicode bidi algorithm, so Arabic-locale
// digit grouping (toLocaleDateString) can render in a reversed/garbled order.
// Use plain Western digits in a fixed DD/MM/YYYY order to keep dates unambiguous.
function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getUTCFullYear()}`;
}

registerArabicFonts();

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 14,
  },
  detailsBox: {
    border: "1px solid #e2e8f0",
    borderRadius: 4,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row-reverse",
    borderBottom: "1px solid #f1f5f9",
    padding: 7,
  },
  detailLabel: {
    width: 160,
    fontWeight: "bold",
    color: "#334155",
    textAlign: "right",
  },
  detailValue: {
    flex: 1,
    textAlign: "right",
  },
  sectionTitle: {
    fontWeight: "bold",
    fontSize: 12,
    marginBottom: 6,
    textAlign: "right",
  },
  detailsTextBox: {
    border: "1px solid #e2e8f0",
    borderRadius: 4,
    padding: 10,
    minHeight: 50,
    marginBottom: 16,
    textAlign: "right",
  },
  signRow: {
    flexDirection: "row-reverse",
    gap: 16,
    marginTop: 20,
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
  },
  stampImage: {
    width: 80,
    height: 80,
    objectFit: "contain",
  },
});

const ASSIGNEE_LABEL: Record<string, string> = {
  GUIDE: "مرشد سياحي",
  DRIVER: "سائق",
};

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const taskOrder = await prisma.taskOrder.findUnique({
    where: { id },
    include: { trip: { include: { program: true, customer: true } }, guide: true, driver: true },
  });

  if (!taskOrder) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const stampBuffer = loadPublicImage(settings?.stampPath);

  const assigneeName = taskOrder.guide?.name ?? taskOrder.driver?.name ?? "—";
  const assigneePhone = taskOrder.guide?.phone ?? taskOrder.driver?.phone ?? "—";

  const rows: [string, string | number][] = [
    ["رقم الأمر", taskOrder.id],
    ["التاريخ", formatDate(taskOrder.taskDate)],
    ["البرنامج السياحي", taskOrder.trip.program.name],
    ["العميل", taskOrder.trip.customer.name],
    ["عدد الأشخاص", taskOrder.trip.numPax],
    ["تاريخ بداية الرحلة", formatDate(taskOrder.trip.startDate)],
    ["تاريخ نهاية الرحلة", formatDate(taskOrder.trip.endDate)],
    ["المكلَّف بالمهمة", assigneeName],
    ["الصفة", ASSIGNEE_LABEL[taskOrder.assigneeType] ?? taskOrder.assigneeType],
    ["رقم هاتف المكلَّف", assigneePhone],
  ];

  const doc = (
    <Document>
      <LetterheadPage settings={settings}>
        <Text style={styles.title}>أمر تكليف بمهمة</Text>

        <View style={styles.detailsBox}>
          {rows.map(([label, value], i) => (
            <View key={label} style={[styles.detailRow, ...(i === rows.length - 1 ? [{ borderBottom: "none" }] : [])]}>
              <Text style={styles.detailLabel}>{label}</Text>
              <MixedText text={String(value)} size={11} containerStyle={{ flex: 1 }} />
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>تفاصيل المهمة</Text>
        <View style={styles.detailsTextBox}>
          {(taskOrder.details || "لا توجد تفاصيل إضافية")
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line, i) => (
              <MixedText key={i} text={line} size={11} containerStyle={{ marginBottom: 4 }} />
            ))}
        </View>

        <View style={styles.signRow} wrap={false}>
          <View style={styles.signBox}>
            <Text style={styles.signLabel}>توقيع المكلَّف بالمهمة</Text>
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signLabel}>ختم الوكالة</Text>
            {stampBuffer ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image, not an HTML img
              <Image src={stampBuffer} style={styles.stampImage} />
            ) : null}
          </View>
        </View>
      </LetterheadPage>
    </Document>
  );

  const buffer = await renderToBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="task-order-${id}.pdf"`,
    },
  });
}
