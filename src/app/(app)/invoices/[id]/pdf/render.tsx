import { Document, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { LetterheadPage, registerArabicFonts, loadPublicImage } from "@/lib/pdf/letterhead";
import { MixedText } from "@/lib/pdf/MixedText";
import { dirStyles, type Lang } from "@/lib/pdf/docLang";
import { makeQrPng } from "@/lib/qr";
import { genToken, verifyUrl } from "@/lib/share";
import { nameOr } from "@/lib/format";
import { RefBar, DocTitle, docStyle } from "@/lib/pdf/chrome";
import { settingsDocStyle } from "@/lib/documents";
import type { InvoiceItem } from "../../actions";

function formatDate(date: Date) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

function money(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function tripDays(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

registerArabicFonts();

const T = {
  ar: {
    title: "فاتورة", invoiceNo: "رقم الفاتورة", date: "التاريخ", billTo: "الفاتورة إلى",
    forTrip: "عن الرحلة", desc: "البيان", qty: "الكمية", unitPrice: "سعر الوحدة", total: "الإجمالي",
    subtotal: "مجموع البنود", discount: "الخصم", grandTotal: "الإجمالي المستحق",
    stamp: "ختم الوكالة",
    tripDetails: "تفاصيل الرحلة", period: "الفترة", duration: "المدة", days: "أيام",
    pax: "عدد المسافرين", program: "البرنامج", notesLabel: "ملاحظات",
  },
  fr: {
    title: "Facture", invoiceNo: "N° de facture", date: "Date", billTo: "Facturé à",
    forTrip: "Voyage", desc: "Désignation", qty: "Qté", unitPrice: "Prix unitaire", total: "Total",
    subtotal: "Sous-total", discount: "Remise", grandTotal: "Total à payer",
    stamp: "Cachet de l'agence",
    tripDetails: "Détails du voyage", period: "Période", duration: "Durée", days: "jours",
    pax: "Voyageurs", program: "Programme", notesLabel: "Remarques",
  },
  en: {
    title: "Invoice", invoiceNo: "Invoice No.", date: "Date", billTo: "Bill To",
    forTrip: "Trip", desc: "Description", qty: "Qty", unitPrice: "Unit Price", total: "Total",
    subtotal: "Subtotal", discount: "Discount", grandTotal: "Amount Due",
    stamp: "Agency Stamp",
    tripDetails: "Trip Details", period: "Period", duration: "Duration", days: "days",
    pax: "Travelers", program: "Program", notesLabel: "Notes",
  },
} as const;

function makeStyles(lang: Lang, st: ReturnType<typeof docStyle>) {
  const d = dirStyles(lang);
  const rtl = d.rtl;
  return StyleSheet.create({
    meta: { fontSize: 10, color: "#475569", textAlign: "center", marginBottom: 16 },
    partyRow: { flexDirection: d.row, marginBottom: 14, gap: 16 },
    partyBox: { flex: 1, border: "1px solid #e2e8f0", borderRadius: 4, padding: 8 },
    partyLabel: { fontSize: 8.5, color: "#64748b", marginBottom: 2, textAlign: d.align },
    partyValue: { fontSize: 11, fontWeight: "bold", textAlign: d.align },
    tableHeader: { flexDirection: d.row, backgroundColor: st.accentColor },
    th: { fontSize: st.fontSize - 1.5, fontWeight: "bold", color: "#ffffff", padding: 7, textAlign: d.align },
    tr: { flexDirection: d.row, borderBottom: "1px solid #e2e8f0" },
    td: { fontSize: st.fontSize - 1, padding: 7, textAlign: d.align, color: st.textColor },
    colNum: { width: 30 },
    colDesc: { flex: 1 },
    colQty: { width: 60 },
    colPrice: { width: 90 },
    colTotal: { width: 95 },
    totalsBox: { marginTop: 12, alignSelf: "flex-start", width: 240 },
    totalRow: { flexDirection: d.row, justifyContent: "space-between", paddingVertical: 4, paddingHorizontal: 8 },
    grandTotal: { backgroundColor: "#f1f5f9", borderTop: `1.5px solid ${st.accentColor}`, marginTop: 2 },
    totalLabel: { fontSize: st.fontSize - 1, color: "#334155" },
    totalValue: { fontSize: st.fontSize - 1, fontWeight: "bold" },
    detailsBox: { border: "1px solid #e2e8f0", borderRadius: 4, padding: 10, marginBottom: 14 },
    detailsTitle: { fontSize: st.fontSize - 1.5, fontWeight: "bold", color: st.accentColor, marginBottom: 6, textAlign: d.align },
    detailsGrid: { flexDirection: d.row, flexWrap: "wrap", gap: 4 },
    detailItem: { fontSize: 9.5, color: "#475569", width: "50%", textAlign: d.align, marginBottom: 2 },
    programText: { marginTop: 6 },
    stampWrap: { marginTop: 28, alignItems: rtl ? "flex-start" : "flex-end" },
    stampBox: {
      border: "1px solid #cbd5e1", borderRadius: 4, padding: 10, minHeight: 95, width: 170,
      alignItems: "center",
    },
    stampLabel: { fontWeight: "bold", marginBottom: 8, textAlign: "center", fontSize: 10 },
    stampImage: { width: 78, height: 78, objectFit: "contain" },
  });
}

// يبني ملف الفاتورة PDF ويعيد المخزن المؤقت مع بيانات الفاتورة (يُستخدم للعرض وللإرسال بالبريد)
export async function renderInvoicePdf(
  id: string,
  lang: Lang
): Promise<{ buffer: Buffer; invoiceNumber: string; email: string | null; customerName: string | null } | null> {
  const t = T[lang];

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: true, trip: { include: { program: true } } },
  });
  if (!invoice) return null;

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const st = docStyle(settingsDocStyle(settings));
  const styles = makeStyles(lang, st);
  const stampBuffer = invoice.showStamp ? loadPublicImage(settings?.stampPath) : null;

  // رمز رابط عام ثابت للتحقق (يُنشأ مرة واحدة ويُحفظ)
  let token = invoice.publicToken;
  if (!token) {
    token = genToken();
    await prisma.invoice.update({ where: { id: invoice.id }, data: { publicToken: token } });
  }
  // الـ QR يحمل رابط التحقق العام من صحة المستند
  const qr = await makeQrPng(verifyUrl("invoice", token));

  const items = Array.isArray(invoice.items) ? (invoice.items as InvoiceItem[]) : [];
  const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0);
  const grandTotal = subtotal - invoice.discount;

  // تفاصيل البرنامج: نفضّل النص اليومي (itinerary) وإلا الوصف العام
  const programText = (invoice.trip?.program.itinerary || invoice.trip?.program.description || "").trim();

  const doc = (
    <Document>
      <LetterheadPage settings={settings} stamp={invoice.showStamp ? stampBuffer : null} qr={qr}>
        <RefBar
          number={`${t.invoiceNo} ${invoice.invoiceNumber}`}
          date={formatDate(invoice.docDate)}
          rtl={lang !== "fr" && lang !== "en"}
          style={st}
        />
        <DocTitle text={t.title} rtl={lang !== "fr" && lang !== "en"} style={st} />

        <View style={styles.partyRow}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>{t.billTo}</Text>
            <MixedText text={nameOr(invoice.customer?.name)} size={11} align={dirStyles(lang).align} baseDir={lang === "fr" ? "ltr" : "auto"} style={{ fontWeight: "bold" }} />
          </View>
          {invoice.trip ? (
            <View style={styles.partyBox}>
              <Text style={styles.partyLabel}>{t.forTrip}</Text>
              <MixedText text={nameOr(invoice.trip.program.name)} size={11} align={dirStyles(lang).align} baseDir={lang === "fr" ? "ltr" : "auto"} style={{ fontWeight: "bold" }} />
            </View>
          ) : null}
        </View>

        {invoice.trip ? (
          <View style={styles.detailsBox}>
            <Text style={styles.detailsTitle}>{t.tripDetails}</Text>
            <View style={styles.detailsGrid}>
              <Text style={styles.detailItem}>
                {t.period}: {formatDate(invoice.trip.startDate)} — {formatDate(invoice.trip.endDate)}
              </Text>
              <Text style={styles.detailItem}>
                {t.duration}: {tripDays(invoice.trip.startDate, invoice.trip.endDate)} {t.days}
              </Text>
              <Text style={styles.detailItem}>
                {t.pax}: {invoice.trip.numPax}
              </Text>
            </View>
            {programText ? (
              <MixedText
                text={programText}
                size={9.5}
                align={dirStyles(lang).align}
                baseDir={lang === "fr" ? "ltr" : "auto"}
                containerStyle={styles.programText}
                style={{ fontSize: 9.5, color: "#475569" }}
              />
            ) : null}
          </View>
        ) : null}

        <View style={styles.tableHeader}>
          <Text style={[styles.th, styles.colNum]}>#</Text>
          <Text style={[styles.th, styles.colDesc]}>{t.desc}</Text>
          <Text style={[styles.th, styles.colQty]}>{t.qty}</Text>
          <Text style={[styles.th, styles.colPrice]}>{t.unitPrice}</Text>
          <Text style={[styles.th, styles.colTotal]}>{t.total}</Text>
        </View>
        {items.map((it, i) => (
          <View key={i} style={styles.tr}>
            <Text style={[styles.td, styles.colNum]}>{i + 1}</Text>
            <View style={[styles.td, styles.colDesc]}>
              <MixedText text={it.description} size={10.5} align={dirStyles(lang).align} baseDir={lang === "fr" ? "ltr" : "auto"} />
            </View>
            <Text style={[styles.td, styles.colQty]}>{it.qty}</Text>
            <Text style={[styles.td, styles.colPrice]}>{money(it.unitPrice)}</Text>
            <Text style={[styles.td, styles.colTotal]}>{money(it.qty * it.unitPrice)}</Text>
          </View>
        ))}

        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t.subtotal}</Text>
            <Text style={styles.totalValue}>
              {money(subtotal)} {invoice.currency}
            </Text>
          </View>
          {invoice.discount > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t.discount}</Text>
              <Text style={[styles.totalValue, { color: "#b91c1c" }]}>
                - {money(invoice.discount)} {invoice.currency}
              </Text>
            </View>
          ) : null}
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={[styles.totalLabel, { fontWeight: "bold" }]}>{t.grandTotal}</Text>
            <Text style={[styles.totalValue, { fontSize: 12 }]}>
              {money(grandTotal)} {invoice.currency}
            </Text>
          </View>
        </View>

        {invoice.notes ? (
          <View style={{ marginTop: 14 }}>
            <Text style={styles.detailsTitle}>{t.notesLabel}</Text>
            <MixedText text={invoice.notes} size={9.5} align={dirStyles(lang).align} baseDir={lang === "fr" ? "ltr" : "auto"} style={{ fontSize: 9.5, color: "#475569" }} />
          </View>
        ) : null}

      </LetterheadPage>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  return {
    buffer,
    invoiceNumber: invoice.invoiceNumber,
    email: invoice.customer?.email ?? null,
    customerName: invoice.customer?.name ?? null,
  };
}
