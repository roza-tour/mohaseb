export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Document, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { LetterheadPage, registerArabicFonts, loadPublicImage } from "@/lib/pdf/letterhead";
import { MixedText } from "@/lib/pdf/MixedText";
import { pickLang, dirStyles, type Lang } from "@/lib/pdf/docLang";

function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getUTCFullYear()}`;
}

registerArabicFonts();

// النصوص الثابتة بالعربية والفرنسية
const T = {
  ar: {
    title: "أمر تكليف بمهمة",
    orderNo: "رقم الأمر",
    date: "التاريخ",
    program: "البرنامج السياحي",
    client: "العميل",
    pax: "عدد الأشخاص",
    tripStart: "تاريخ بداية الرحلة",
    tripEnd: "تاريخ نهاية الرحلة",
    assignee: "المكلَّف بالمهمة",
    role: "الصفة",
    phone: "رقم هاتف المكلَّف",
    detailsTitle: "تفاصيل المهمة",
    noDetails: "لا توجد تفاصيل إضافية",
    signAssignee: "توقيع المكلَّف بالمهمة",
    signStamp: "ختم الوكالة",
    GUIDE: "مرشد سياحي",
    DRIVER: "سائق",
  },
  fr: {
    title: "Ordre de Mission",
    orderNo: "N° d'ordre",
    date: "Date",
    program: "Programme",
    client: "Client",
    pax: "Nombre de personnes",
    tripStart: "Date de début",
    tripEnd: "Date de fin",
    assignee: "Chargé de mission",
    role: "Qualité",
    phone: "Téléphone",
    detailsTitle: "Détails de la mission",
    noDetails: "Aucun détail supplémentaire",
    signAssignee: "Signature du chargé de mission",
    signStamp: "Cachet de l'agence",
    GUIDE: "Guide touristique",
    DRIVER: "Chauffeur",
  },
} as const;

function makeStyles(lang: Lang) {
  const d = dirStyles(lang);
  return StyleSheet.create({
    title: { fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 14 },
    detailsBox: { border: "1px solid #e2e8f0", borderRadius: 4, marginBottom: 16 },
    detailRow: { flexDirection: d.row, borderBottom: "1px solid #f1f5f9", padding: 7 },
    detailLabel: { width: 160, fontWeight: "bold", color: "#334155", textAlign: d.align },
    detailValue: { flex: 1, textAlign: d.align },
    sectionTitle: { fontWeight: "bold", fontSize: 12, marginBottom: 6, textAlign: d.align },
    detailsTextBox: {
      border: "1px solid #e2e8f0",
      borderRadius: 4,
      padding: 10,
      minHeight: 50,
      marginBottom: 16,
      textAlign: d.align,
    },
    signRow: { flexDirection: d.row, gap: 16, marginTop: 20 },
    signBox: {
      flex: 1,
      border: "1px solid #cbd5e1",
      borderRadius: 4,
      padding: 10,
      minHeight: 96,
      alignItems: "center",
    },
    signLabel: { fontWeight: "bold", marginBottom: 8, textAlign: "center" },
    stampImage: { width: 80, height: 80, objectFit: "contain" },
  });
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const lang = pickLang(req.url, "ar");
  const t = T[lang];
  const styles = makeStyles(lang);

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
  const roleLabel = taskOrder.assigneeType === "GUIDE" ? t.GUIDE : taskOrder.assigneeType === "DRIVER" ? t.DRIVER : taskOrder.assigneeType;

  const rows: [string, string | number][] = [
    [t.orderNo, taskOrder.id],
    [t.date, formatDate(taskOrder.taskDate)],
    [t.program, taskOrder.trip.program.name],
    [t.client, taskOrder.trip.customer.name],
    [t.pax, taskOrder.trip.numPax],
    [t.tripStart, formatDate(taskOrder.trip.startDate)],
    [t.tripEnd, formatDate(taskOrder.trip.endDate)],
    [t.assignee, assigneeName],
    [t.role, roleLabel],
    [t.phone, assigneePhone],
  ];

  const doc = (
    <Document>
      <LetterheadPage settings={settings}>
        <Text style={styles.title}>{t.title}</Text>

        <View style={styles.detailsBox}>
          {rows.map(([label, value], i) => (
            <View key={label} style={[styles.detailRow, ...(i === rows.length - 1 ? [{ borderBottom: "none" }] : [])]}>
              <Text style={styles.detailLabel}>{label}</Text>
              <MixedText text={String(value)} size={11} align={dirStyles(lang).align} baseDir={lang === "fr" ? "ltr" : "auto"} containerStyle={{ flex: 1 }} />
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t.detailsTitle}</Text>
        <View style={styles.detailsTextBox}>
          {(taskOrder.details || t.noDetails)
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line, i) => (
              <MixedText key={i} text={line} size={11} align={dirStyles(lang).align} baseDir={lang === "fr" ? "ltr" : "auto"} containerStyle={{ marginBottom: 4 }} />
            ))}
        </View>

        <View style={styles.signRow} wrap={false}>
          <View style={styles.signBox}>
            <Text style={styles.signLabel}>{t.signAssignee}</Text>
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signLabel}>{t.signStamp}</Text>
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
      "Content-Disposition": `inline; filename="task-order-${id}-${lang}.pdf"`,
    },
  });
}
