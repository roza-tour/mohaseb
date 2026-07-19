export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Document, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { LetterheadPage, registerArabicFonts, loadPublicImage } from "@/lib/pdf/letterhead";
import { MixedText } from "@/lib/pdf/MixedText";
import type { InvoiceItem } from "../../actions";

function formatDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function money(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

registerArabicFonts();

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 6,
  },
  meta: {
    fontSize: 10,
    color: "#475569",
    textAlign: "center",
    marginBottom: 16,
  },
  partyRow: {
    flexDirection: "row-reverse",
    marginBottom: 14,
    gap: 16,
  },
  partyBox: {
    flex: 1,
    border: "1px solid #e2e8f0",
    borderRadius: 4,
    padding: 8,
  },
  partyLabel: {
    fontSize: 8.5,
    color: "#64748b",
    marginBottom: 2,
    textAlign: "right",
  },
  partyValue: {
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "right",
  },
  tableHeader: {
    flexDirection: "row-reverse",
    backgroundColor: "#f1f5f9",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottom: "1.5px solid #cbd5e1",
  },
  th: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#334155",
    padding: 7,
    textAlign: "right",
  },
  tr: {
    flexDirection: "row-reverse",
    borderBottom: "1px solid #f1f5f9",
  },
  td: {
    fontSize: 10.5,
    padding: 7,
    textAlign: "right",
  },
  colNum: { width: 30 },
  colDesc: { flex: 1 },
  colQty: { width: 60 },
  colPrice: { width: 90 },
  colTotal: { width: 95 },
  totalsBox: {
    marginTop: 12,
    alignSelf: "flex-start",
    width: 240,
  },
  totalRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  grandTotal: {
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
    marginTop: 2,
  },
  totalLabel: {
    fontSize: 10.5,
    color: "#334155",
  },
  totalValue: {
    fontSize: 10.5,
    fontWeight: "bold",
  },
  notes: {
    fontSize: 9.5,
    color: "#475569",
    marginTop: 14,
    textAlign: "right",
  },
  signRow: {
    flexDirection: "row-reverse",
    gap: 16,
    marginTop: 24,
  },
  signBox: {
    flex: 1,
    border: "1px solid #cbd5e1",
    borderRadius: 4,
    padding: 10,
    minHeight: 90,
    alignItems: "center",
  },
  signLabel: {
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
    fontSize: 10,
  },
  stampImage: {
    width: 75,
    height: 75,
    objectFit: "contain",
  },
});

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: true, trip: { include: { program: true } } },
  });
  if (!invoice) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const stampBuffer = invoice.showStamp ? loadPublicImage(settings?.stampPath) : null;

  const items = (invoice.items as InvoiceItem[]) ?? [];
  const subtotal = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  const grandTotal = subtotal - invoice.discount;

  const doc = (
    <Document>
      <LetterheadPage settings={settings}>
        <Text style={styles.title}>فاتورة</Text>
        <Text style={styles.meta}>
          رقم الفاتورة: {invoice.invoiceNumber}   |   التاريخ: {formatDate(invoice.docDate)}
        </Text>

        <View style={styles.partyRow}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>الفاتورة إلى</Text>
            <MixedText text={invoice.customer?.name ?? "—"} size={11} style={{ fontWeight: "bold" }} />
          </View>
          {invoice.trip ? (
            <View style={styles.partyBox}>
              <Text style={styles.partyLabel}>عن الرحلة</Text>
              <MixedText text={invoice.trip.program.name} size={11} style={{ fontWeight: "bold" }} />
            </View>
          ) : null}
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.th, styles.colNum]}>#</Text>
          <Text style={[styles.th, styles.colDesc]}>البيان</Text>
          <Text style={[styles.th, styles.colQty]}>الكمية</Text>
          <Text style={[styles.th, styles.colPrice]}>سعر الوحدة</Text>
          <Text style={[styles.th, styles.colTotal]}>الإجمالي</Text>
        </View>
        {items.map((it, i) => (
          <View key={i} style={styles.tr}>
            <Text style={[styles.td, styles.colNum]}>{i + 1}</Text>
            <View style={[styles.td, styles.colDesc]}>
              <MixedText text={it.description} size={10.5} />
            </View>
            <Text style={[styles.td, styles.colQty]}>{it.qty}</Text>
            <Text style={[styles.td, styles.colPrice]}>{money(it.unitPrice)}</Text>
            <Text style={[styles.td, styles.colTotal]}>{money(it.qty * it.unitPrice)}</Text>
          </View>
        ))}

        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>مجموع البنود</Text>
            <Text style={styles.totalValue}>
              {money(subtotal)} {invoice.currency}
            </Text>
          </View>
          {invoice.discount > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>الخصم</Text>
              <Text style={[styles.totalValue, { color: "#b91c1c" }]}>
                - {money(invoice.discount)} {invoice.currency}
              </Text>
            </View>
          ) : null}
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={[styles.totalLabel, { fontWeight: "bold" }]}>الإجمالي المستحق</Text>
            <Text style={[styles.totalValue, { fontSize: 12 }]}>
              {money(grandTotal)} {invoice.currency}
            </Text>
          </View>
        </View>

        {invoice.notes ? <MixedText text={invoice.notes} size={9.5} containerStyle={{ marginTop: 14 }} style={{ fontSize: 9.5, color: "#475569" }} /> : null}

        {invoice.showStamp ? (
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
    </Document>
  );

  const buffer = await renderToBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${invoice.invoiceNumber.replace("/", "-")}.pdf"`,
    },
  });
}
