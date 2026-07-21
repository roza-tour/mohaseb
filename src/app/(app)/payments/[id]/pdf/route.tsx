export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Document, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { LetterheadPage, registerArabicFonts, loadPublicImage } from "@/lib/pdf/letterhead";
import { MixedText } from "@/lib/pdf/MixedText";
import { PAYMENT_METHOD_LABELS } from "@/lib/payments";
import { pickLang, dirStyles, type Lang } from "@/lib/pdf/docLang";

function formatDate(date: Date) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

function formatAmount(amount: number, currency: string) {
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

registerArabicFonts();

const T = {
  ar: {
    title: "سند قبض", receiptNo: "رقم السند", date: "التاريخ", amountLabel: "المبلغ المستلم",
    receivedFrom: "استلمنا من السيد/ة", amountWords: "مبلغاً وقدره", forWhat: "وذلك عن",
    method: "طريقة الدفع", reference: "المرجع", notes: "ملاحظات", paymentDate: "تاريخ الدفعة",
    agreedTotal: "السعر الإجمالي المتفق عليه", paidToDate: "إجمالي المدفوع حتى تاريخه",
    remaining: "المبلغ المتبقي", signReceiver: "توقيع المستلم", stamp: "ختم الوكالة",
  },
  fr: {
    title: "Reçu de paiement", receiptNo: "N° du reçu", date: "Date", amountLabel: "Montant reçu",
    receivedFrom: "Reçu de M./Mme", amountWords: "La somme de", forWhat: "Au titre de",
    method: "Mode de paiement", reference: "Référence", notes: "Remarques", paymentDate: "Date du paiement",
    agreedTotal: "Prix total convenu", paidToDate: "Total payé à ce jour",
    remaining: "Montant restant", signReceiver: "Signature du bénéficiaire", stamp: "Cachet de l'agence",
  },
} as const;

const METHOD_FR: Record<string, string> = {
  CASH: "Espèces", BANK: "Virement bancaire", CHEQUE: "Chèque", OTHER: "Autre",
};

function makeStyles(lang: Lang) {
  const d = dirStyles(lang);
  return StyleSheet.create({
    title: { fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 6 },
    receiptNumber: { fontSize: 10, color: "#475569", textAlign: "center", marginBottom: 18 },
    amountBox: { border: "1.5px solid #cbd5e1", borderRadius: 6, padding: 14, marginBottom: 16, alignItems: "center" },
    amountLabel: { fontSize: 10, color: "#475569", marginBottom: 4 },
    amountValue: { fontSize: 20, fontWeight: "bold", color: "#065f46" },
    detailsBox: { border: "1px solid #e2e8f0", borderRadius: 4, marginBottom: 16 },
    detailRow: { flexDirection: d.row, borderBottom: "1px solid #f1f5f9", padding: 7 },
    detailLabel: { width: 170, fontWeight: "bold", color: "#334155", textAlign: d.align, fontSize: 11 },
    summaryRow: { flexDirection: d.row, gap: 16, marginBottom: 20 },
    summaryBox: { flex: 1, border: "1px solid #e2e8f0", borderRadius: 4, padding: 8, alignItems: "center" },
    summaryLabel: { fontSize: 9, color: "#475569", marginBottom: 3, textAlign: "center" },
    summaryValue: { fontSize: 12, fontWeight: "bold" },
    signRow: { flexDirection: d.row, gap: 16, marginTop: 16 },
    signBox: { flex: 1, border: "1px solid #cbd5e1", borderRadius: 4, padding: 10, minHeight: 96, alignItems: "center" },
    signLabel: { fontWeight: "bold", marginBottom: 8, textAlign: "center", fontSize: 10 },
    stampImage: { width: 80, height: 80, objectFit: "contain" },
  });
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const lang = pickLang(req.url, "ar");
  const t = T[lang];
  const styles = makeStyles(lang);

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      trip: {
        include: {
          program: true,
          customer: true,
          payments: { orderBy: { paidAt: "asc" } },
        },
      },
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const stampBuffer = loadPublicImage(settings?.stampPath);

  const trip = payment.trip;
  // المدفوع حتى هذا السند (شاملاً إياه) والمتبقي بعده — نرتّب زمنياً بـ createdAt
  const paidUpToThis = trip.payments
    .filter((p) => p.createdAt < payment.createdAt || p.id === payment.id)
    .reduce((s, p) => s + p.amount, 0);
  const remainingAfter = trip.agreedPrice - paidUpToThis;

  const methodLabel = lang === "fr" ? METHOD_FR[payment.method] ?? payment.method : PAYMENT_METHOD_LABELS[payment.method] ?? payment.method;

  const rows: [string, string][] = [
    [t.receivedFrom, trip.customer.name],
    [t.amountWords, formatAmount(payment.amount, trip.currency)],
    [t.forWhat, `${trip.program.name} (${formatDate(trip.startDate)} - ${formatDate(trip.endDate)})`],
    [t.method, methodLabel],
    ...(payment.reference ? ([[t.reference, payment.reference]] as [string, string][]) : []),
    ...(payment.notes ? ([[t.notes, payment.notes]] as [string, string][]) : []),
    [t.paymentDate, formatDate(payment.paidAt)],
  ];

  const doc = (
    <Document>
      <LetterheadPage settings={settings}>
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.receiptNumber}>
          {t.receiptNo}: {payment.receiptNumber}   |   {t.date}: {formatDate(payment.paidAt)}
        </Text>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>{t.amountLabel}</Text>
          <Text style={styles.amountValue}>{formatAmount(payment.amount, trip.currency)}</Text>
        </View>

        <View style={styles.detailsBox}>
          {rows.map(([label, value], i) => (
            <View
              key={label + i}
              style={[styles.detailRow, ...(i === rows.length - 1 ? [{ borderBottom: "none" }] : [])]}
            >
              <Text style={styles.detailLabel}>{label}</Text>
              <MixedText text={value} size={11} align={dirStyles(lang).align} baseDir={lang === "fr" ? "ltr" : "auto"} containerStyle={{ flex: 1 }} />
            </View>
          ))}
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>{t.agreedTotal}</Text>
            <Text style={styles.summaryValue}>{formatAmount(trip.agreedPrice, trip.currency)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>{t.paidToDate}</Text>
            <Text style={[styles.summaryValue, { color: "#065f46" }]}>
              {formatAmount(paidUpToThis, trip.currency)}
            </Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>{t.remaining}</Text>
            <Text style={[styles.summaryValue, { color: remainingAfter > 0 ? "#b45309" : "#065f46" }]}>
              {formatAmount(Math.max(remainingAfter, 0), trip.currency)}
            </Text>
          </View>
        </View>

        <View style={styles.signRow} wrap={false}>
          <View style={styles.signBox}>
            <Text style={styles.signLabel}>{t.signReceiver}</Text>
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signLabel}>{t.stamp}</Text>
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
      "Content-Disposition": `inline; filename="receipt-${payment.receiptNumber.replace("/", "-")}-${lang}.pdf"`,
    },
  });
}
