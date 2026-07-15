export const runtime = "nodejs";

import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { Document, Page, Text, View, Image, Font, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";

// react-pdf/pdfkit doesn't implement the Unicode bidi algorithm, so Arabic-locale
// digit grouping (toLocaleDateString) can render in a reversed/garbled order.
// Use plain Western digits in a fixed DD/MM/YYYY order to keep dates unambiguous.
function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

Font.register({
  family: "Tajawal",
  fonts: [
    { src: path.join(process.cwd(), "public/fonts/Tajawal-Regular.ttf") },
    { src: path.join(process.cwd(), "public/fonts/Tajawal-Bold.ttf"), fontWeight: "bold" },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Tajawal",
    padding: 36,
    fontSize: 11,
    color: "#0f172a",
    direction: "rtl",
  },
  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    borderBottom: "1px solid #cbd5e1",
    paddingBottom: 12,
  },
  agencyInfo: {
    textAlign: "right",
  },
  agencyName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 3,
  },
  agencyLine: {
    fontSize: 9,
    color: "#475569",
    marginBottom: 2,
  },
  logo: {
    width: 60,
    height: 60,
    objectFit: "contain",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  detailsBox: {
    border: "1px solid #e2e8f0",
    borderRadius: 4,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row-reverse",
    borderBottom: "1px solid #f1f5f9",
    padding: 8,
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
    minHeight: 60,
    marginBottom: 24,
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
    minHeight: 110,
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

function readFileAsBuffer(publicRelativePath: string): Buffer | null {
  try {
    const full = path.join(process.cwd(), "public", publicRelativePath.replace(/^\//, ""));
    return fs.readFileSync(full);
  } catch {
    return null;
  }
}

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

  const logoBuffer = settings?.logoPath ? readFileAsBuffer(settings.logoPath) : null;
  const stampBuffer = settings?.stampPath ? readFileAsBuffer(settings.stampPath) : null;

  const assigneeName = taskOrder.guide?.name ?? taskOrder.driver?.name ?? "—";
  const assigneePhone = taskOrder.guide?.phone ?? taskOrder.driver?.phone ?? "—";

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.agencyInfo}>
            <Text style={styles.agencyName}>{settings?.agencyName ?? "وكالة روزا تور السياحية"}</Text>
            {settings?.agencyAddress ? <Text style={styles.agencyLine}>{settings.agencyAddress}</Text> : null}
            {settings?.agencyPhone ? (
              <View style={{ flexDirection: "row-reverse" }}>
                <Text style={styles.agencyLine}>هاتف: </Text>
                <Text style={styles.agencyLine}>{settings.agencyPhone}</Text>
              </View>
            ) : null}
            {settings?.agencyEmail ? <Text style={styles.agencyLine}>{settings.agencyEmail}</Text> : null}
          </View>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image, not an HTML img */}
          {logoBuffer ? <Image src={logoBuffer} style={styles.logo} /> : null}
        </View>

        <Text style={styles.title}>أمر تكليف بمهمة</Text>

        <View style={styles.detailsBox}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>رقم الأمر</Text>
            <Text style={styles.detailValue}>{taskOrder.id}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>التاريخ</Text>
            <Text style={styles.detailValue}>{formatDate(taskOrder.taskDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>البرنامج السياحي</Text>
            <Text style={styles.detailValue}>{taskOrder.trip.program.name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>العميل</Text>
            <Text style={styles.detailValue}>{taskOrder.trip.customer.name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>عدد الأشخاص</Text>
            <Text style={styles.detailValue}>{taskOrder.trip.numPax}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>تاريخ بداية الرحلة</Text>
            <Text style={styles.detailValue}>{formatDate(taskOrder.trip.startDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>تاريخ نهاية الرحلة</Text>
            <Text style={styles.detailValue}>{formatDate(taskOrder.trip.endDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>المكلَّف بالمهمة</Text>
            <Text style={styles.detailValue}>{assigneeName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>الصفة</Text>
            <Text style={styles.detailValue}>{ASSIGNEE_LABEL[taskOrder.assigneeType] ?? taskOrder.assigneeType}</Text>
          </View>
          <View style={[styles.detailRow, { borderBottom: "none" }]}>
            <Text style={styles.detailLabel}>رقم هاتف المكلَّف</Text>
            <Text style={styles.detailValue}>{assigneePhone}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>تفاصيل المهمة</Text>
        <Text style={styles.detailsTextBox}>{taskOrder.details || "لا توجد تفاصيل إضافية"}</Text>

        <View style={styles.signRow}>
          <View style={styles.signBox}>
            <Text style={styles.signLabel}>توقيع المكلَّف بالمهمة</Text>
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signLabel}>ختم الوكالة</Text>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image, not an HTML img */}
            {stampBuffer ? <Image src={stampBuffer} style={styles.stampImage} /> : null}
          </View>
        </View>
      </Page>
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
