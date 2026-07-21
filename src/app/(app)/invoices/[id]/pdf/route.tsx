export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Document, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { LetterheadPage, registerArabicFonts, loadPublicImage } from "@/lib/pdf/letterhead";
import { MixedText } from "@/lib/pdf/MixedText";
import { pickLang, dirStyles, type Lang } from "@/lib/pdf/docLang";
import { nameOr } from "@/lib/format";
import type { InvoiceItem } from "../../actions";

function formatDate(date: Date) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

function money(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

registerArabicFonts();

const T = {
  ar: {
    title: "فاتورة", invoiceNo: "رقم الفاتورة", date: "التاريخ", billTo: "الفاتورة إلى",
    forTrip: "عن الرحلة", desc: "البيان", qty: "الكمية", unitPrice: "سعر الوحدة", total: "الإجمالي",
    subtotal: "مجموع البنود", discount: "الخصم", grandTotal: "الإجمالي المستحق",
    signature: "التوقيع", stamp: "ختم الوكالة",
  },
  fr: {
    title: "Facture", invoiceNo: "N° de facture", date: "Date", billTo: "Facturé à",
    forTrip: "Voyage", desc: "Désignation", qty: "Qté", unitPrice: "Prix unitaire", total: "Total",
    subtotal: "Sous-total", discount: "Remise", grandTotal: "Total à payer",
    signature: "Signature", stamp: "Cachet de l'agence",
  },
} as const;

function makeStyles(lang: Lang) {
  const d = dirStyles(lang);
  return StyleSheet.create({
    title: { fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 6 },
    meta: { fontSize: 10, color: "#475569", textAlign: "center", marginBottom: 16 },
    partyRow: { flexDirection: d.row, marginBottom: 14, gap: 16 },
    partyBox: { flex: 1, border: "1px solid #e2e8f0", borderRadius: 4, padding: 8 },
    partyLabel: { fontSize: 8.5, color: "#64748b", marginBottom: 2, textAlign: d.align },
    partyValue: { fontSize: 11, fontWeight: "bold", textAlign: d.align },
    tableHeader: {
      flexDirection: d.row, backgroundColor: "#f1f5f9",
      borderTopLeftRadius: 4, borderTopRightRadius: 4, borderBottom: "1.5px solid #cbd5e1",
    },
    th: { fontSize: 10, fontWeight: "bold", color: "#334155", padding: 7, textAlign: d.align },
    tr: { flexDirection: d.row, borderBottom: "1px solid #f1f5f9" },
    td: { fontSize: 10.5, padding: 7, textAlign: d.align },
    colNum: { width: 30 },
    colDesc: { flex: 1 },
    colQty: { width: 60 },
    colPrice: { width: 90 },
    colTotal: { width: 95 },
    totalsBox: { marginTop: 12, alignSelf: "flex-start", width: 240 },
    totalRow: { flexDirection: d.row, justifyContent: "space-between", paddingVertical: 4, paddingHorizontal: 8 },
    grandTotal: { backgroundColor: "#f1f5f9", borderRadius: 4, marginTop: 2 },
    totalLabel: { fontSize: 10.5, color: "#334155" },
    totalValue: { fontSize: 10.5, fontWeight: "bold" },
    signRow: { flexDirection: d.row, gap: 16, marginTop: 24 },
    signBox: { flex: 1, border: "1px solid #cbd5e1", borderRadius: 4, padding: 10, minHeight: 90, alignItems: "center" },
    signLabel: { fontWeight: "bold", marginBottom: 8, textAlign: "center", fontSize: 10 },
    stampImage: { width: 75, height: 75, objectFit: "contain" },
  });
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const lang = pickLang(req.url, "ar");
  const t = T[lang];
  const styles = makeStyles(lang);

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: true, trip: { include: { program: true } } },
  });
  if (!invoice) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const stampBuffer = invoice.showStamp ? loadPublicImage(settings?.stampPath) : null;

  const items = Array.isArray(invoice.items) ? (invoice.items as InvoiceItem[]) : [];
  const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0);
  const grandTotal = subtotal - invoice.discount;

  const doc = (
    <Document>
      <LetterheadPage settings={settings}>
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.meta}>
          {t.invoiceNo}: {invoice.invoiceNumber}   |   {t.date}: {formatDate(invoice.docDate)}
        </Text>

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

        {invoice.notes ? <MixedText text={invoice.notes} size={9.5} align={dirStyles(lang).align} baseDir={lang === "fr" ? "ltr" : "auto"} containerStyle={{ marginTop: 14 }} style={{ fontSize: 9.5, color: "#475569" }} /> : null}

        {invoice.showStamp ? (
          <View style={styles.signRow} wrap={false}>
            <View style={styles.signBox}>
              <Text style={styles.signLabel}>{t.signature}</Text>
            </View>
            <View style={styles.signBox}>
              <Text style={styles.signLabel}>{t.stamp}</Text>
              {stampBuffer ? (
                // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image, not an HTML img
                <Image src={stampBuffer} style={styles.stampImage} />
              ) : null}
            </View>
          </View>
        ) : null}
      </LetterheadPage>
    </Document>
  );

  const buffer = await renderToBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${invoice.invoiceNumber.replace(/[^0-9A-Za-z]/g, "-")}-${lang}.pdf"`,
    },
  });
}
