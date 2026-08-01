import { Document, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { LetterheadPage, registerArabicFonts, loadPublicImage } from "@/lib/pdf/letterhead";
import { RefBar, DocTitle, SectionTitle, InfoTable, docStyle } from "@/lib/pdf/chrome";
import { settingsDocStyle, type DocumentStyle } from "@/lib/documents";
import { PAYMENT_METHOD_LABELS } from "@/lib/payments";
import { nameOr } from "@/lib/format";
import { makeQrPng, docQrText } from "@/lib/qr";

registerArabicFonts();

function fmt(date: Date) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

function money(amount: number, currency: string) {
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

const T = {
  ar: {
    title: "سند قبض", receiptNo: "رقم السند", amountLabel: "المبلغ المستلم",
    detailsSection: "بيانات الدفعة", summarySection: "الوضع المالي للرحلة",
    receivedFrom: "استلمنا من السيد/ة", forWhat: "وذلك عن",
    method: "طريقة الدفع", reference: "المرجع", notes: "ملاحظات", paymentDate: "تاريخ الدفعة",
    agreedTotal: "السعر الإجمالي المتفق عليه", paidToDate: "إجمالي المدفوع حتى تاريخه",
    remaining: "المبلغ المتبقي",
  },
  fr: {
    title: "Reçu de paiement", receiptNo: "N° du reçu", amountLabel: "Montant reçu",
    detailsSection: "Détails du paiement", summarySection: "Situation financière du voyage",
    receivedFrom: "Reçu de M./Mme", forWhat: "Au titre de",
    method: "Mode de paiement", reference: "Référence", notes: "Remarques", paymentDate: "Date du paiement",
    agreedTotal: "Prix total convenu", paidToDate: "Total payé à ce jour",
    remaining: "Montant restant",
  },
} as const;

const METHOD_FR: Record<string, string> = {
  CASH: "Espèces", BANK: "Virement bancaire", CHEQUE: "Chèque", OTHER: "Autre",
};

const styles = StyleSheet.create({
  amountBox: { backgroundColor: "#f8fafc", padding: 14, marginBottom: 18, alignItems: "center" },
  amountLabel: { fontSize: 10, color: "#475569", marginBottom: 4 },
  amountValue: { fontSize: 20, fontWeight: "bold", color: "#065f46" },
  summaryRow: { gap: 12 },
  summaryBox: { flex: 1, border: "1px solid #cbd5e1", padding: 9, alignItems: "center" },
  summaryLabel: { fontSize: 9, color: "#475569", marginBottom: 3, textAlign: "center" },
  summaryValue: { fontSize: 12, fontWeight: "bold" },
});

export type ReceiptDocData = {
  receiptNumber: string;
  paidAt: Date;
  amount: number;
  method: string;
  reference: string;
  notes: string;
  currency: string;
  customerName: string;
  programName: string;
  tripStart: Date;
  tripEnd: Date;
  agreedPrice: number;
  paidUpToThis: number;
};

export function buildReceiptDoc({
  p,
  settings,
  stamp,
  qr,
  lang,
  style,
}: {
  p: ReceiptDocData;
  settings: Parameters<typeof LetterheadPage>[0]["settings"];
  stamp: Buffer | null;
  qr: Buffer | null;
  lang: "ar" | "fr";
  style?: DocumentStyle;
}) {
  const t = T[lang];
  const st = docStyle(style);
  const rtl = lang === "ar";
  const baseDir = rtl ? ("auto" as const) : ("ltr" as const);
  const rowDir = rtl ? ("row-reverse" as const) : ("row" as const);
  const remainingAfter = p.agreedPrice - p.paidUpToThis;

  const methodLabel =
    lang === "fr" ? METHOD_FR[p.method] ?? p.method : PAYMENT_METHOD_LABELS[p.method] ?? p.method;

  const rows: [string, string][] = [
    [t.receivedFrom, nameOr(p.customerName)],
    [t.forWhat, `${nameOr(p.programName)} (${fmt(p.tripStart)} - ${fmt(p.tripEnd)})`],
    [t.method, methodLabel],
    ...(p.reference ? ([[t.reference, p.reference]] as [string, string][]) : []),
    ...(p.notes ? ([[t.notes, p.notes]] as [string, string][]) : []),
    [t.paymentDate, fmt(p.paidAt)],
  ];

  return (
    <Document>
      <LetterheadPage settings={settings} stamp={stamp} qr={qr}>
        <RefBar number={`${t.receiptNo} ${p.receiptNumber}`} date={fmt(p.paidAt)} rtl={rtl} style={style} />
        <DocTitle text={t.title} rtl={rtl} style={style} />

        <View style={[styles.amountBox, { border: `1.5px solid ${st.accentColor}` }]}>
          <Text style={styles.amountLabel}>{t.amountLabel}</Text>
          <Text style={styles.amountValue}>{money(p.amount, p.currency)}</Text>
        </View>

        <SectionTitle text={t.detailsSection} rtl={rtl} style={style} />
        <InfoTable rows={rows} rtl={rtl} baseDir={baseDir} style={style} />

        <SectionTitle text={t.summarySection} rtl={rtl} style={style} />
        <View style={[styles.summaryRow, { flexDirection: rowDir }]}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>{t.agreedTotal}</Text>
            <Text style={styles.summaryValue}>{money(p.agreedPrice, p.currency)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>{t.paidToDate}</Text>
            <Text style={[styles.summaryValue, { color: "#065f46" }]}>
              {money(p.paidUpToThis, p.currency)}
            </Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>{t.remaining}</Text>
            <Text style={[styles.summaryValue, { color: remainingAfter > 0 ? "#b45309" : "#065f46" }]}>
              {money(Math.max(remainingAfter, 0), p.currency)}
            </Text>
          </View>
        </View>
      </LetterheadPage>
    </Document>
  );
}

export async function renderReceiptPdf(
  id: string,
  lang: "ar" | "fr"
): Promise<{ buffer: Buffer; receiptNumber: string } | null> {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      trip: {
        include: { program: true, customer: true, payments: { orderBy: { paidAt: "asc" } } },
      },
    },
  });
  if (!payment) return null;

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const stamp = loadPublicImage(settings?.stampPath);
  const qr = await makeQrPng(
    docQrText({
      agency: settings?.agencyName,
      type: "Reçu",
      number: payment.receiptNumber,
      date: fmt(payment.paidAt),
      website: settings?.agencyWebsite,
    })
  );

  const trip = payment.trip;
  // المدفوع حتى هذا السند (شاملاً إياه) — نرتّب زمنياً بـ createdAt ثم بالمعرّف عند التساوي
  const paidUpToThis = trip.payments
    .filter(
      (x) =>
        x.createdAt.getTime() < payment.createdAt.getTime() ||
        (x.createdAt.getTime() === payment.createdAt.getTime() && x.id <= payment.id)
    )
    .reduce((s, x) => s + x.amount, 0);

  const buffer = await renderToBuffer(
    buildReceiptDoc({
      p: {
        receiptNumber: payment.receiptNumber,
        paidAt: payment.paidAt,
        amount: payment.amount,
        method: payment.method,
        reference: payment.reference ?? "",
        notes: payment.notes ?? "",
        currency: trip.currency,
        customerName: trip.customer.name,
        programName: trip.program.name,
        tripStart: trip.startDate,
        tripEnd: trip.endDate,
        agreedPrice: trip.agreedPrice,
        paidUpToThis,
      },
      settings,
      stamp,
      qr,
      lang,
      style: settingsDocStyle(settings),
    })
  );
  return { buffer, receiptNumber: payment.receiptNumber };
}
