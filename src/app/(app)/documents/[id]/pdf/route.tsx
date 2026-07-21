export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Document as PdfDocument, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { LetterheadPage, registerArabicFonts, loadPublicImage } from "@/lib/pdf/letterhead";
import { MixedText } from "@/lib/pdf/MixedText";
import { parseBodyLines, parseDocStyle, PAGE_BREAK } from "@/lib/documents";

function formatDate(date: Date) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

registerArabicFonts();

const staticStyles = StyleSheet.create({
  metaRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  metaText: {
    fontSize: 9,
    color: "#475569",
  },
  signRow: {
    marginTop: 28,
    alignItems: "flex-start",
  },
  signBox: {
    width: 180,
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

  const style = parseDocStyle(doc.style);
  // "يمين" = محاذاة طبيعية حسب اتجاه كل فقرة (يمين للعربية، يسار للإنجليزية)
  const align = style.align === "center" ? ("center" as const) : ("auto" as const);

  const paragraphText = {
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    color: style.textColor,
  };
  const h1Text = {
    fontSize: style.fontSize + 4,
    lineHeight: style.lineHeight,
    color: style.accentColor,
    fontWeight: "bold" as const,
  };
  const h2Text = {
    fontSize: style.fontSize + 2,
    lineHeight: style.lineHeight,
    color: style.accentColor,
    fontWeight: "bold" as const,
  };

  // يمكن أن يتكوّن المستند من أكثر من صفحة عبر فاصل الصفحات ---PAGE---
  // (مثال: الدعوة = صفحة طلب الموافقة + صفحة مخطط الرحلة)، وكل صفحة تُختم.
  const pageTexts = doc.body.split(new RegExp(`^\\s*${PAGE_BREAK}\\s*$`, "m"));

  const renderBody = (bodyText: string) => (
    <View
      style={
        style.bodyBorder
          ? { border: `1.2px solid ${style.accentColor}`, borderRadius: 6, padding: 14 }
          : {}
      }
    >
      {parseBodyLines(bodyText).map((line, i) => {
        if (line.kind === "divider") {
          return (
            <View
              key={i}
              style={{ borderBottom: `1px solid ${style.accentColor}`, marginVertical: 8 }}
            />
          );
        }
        if (line.kind === "h1" || line.kind === "h2") {
          const textStyle = line.kind === "h1" ? h1Text : h2Text;
          return (
            <MixedText
              key={i}
              text={line.text}
              style={textStyle}
              size={textStyle.fontSize}
              align={align}
              containerStyle={{ marginBottom: 6, marginTop: 4 }}
            />
          );
        }
        return (
          <MixedText
            key={i}
            text={line.text}
            style={paragraphText}
            size={style.fontSize}
            align={align}
            containerStyle={{ marginBottom: 9 }}
          />
        );
      })}
    </View>
  );

  const pdf = (
    <PdfDocument>
      {pageTexts.map((pageText, p) => (
        <LetterheadPage key={p} settings={settings} stamp={stampBuffer}>
          {p === 0 ? (
            <>
              <View style={staticStyles.metaRow}>
                <Text style={staticStyles.metaText}>N° {doc.docNumber}</Text>
                <Text style={staticStyles.metaText}>{formatDate(doc.docDate)}</Text>
              </View>
              <MixedText
                text={doc.title}
                style={{ fontSize: 18, fontWeight: "bold", color: style.textColor }}
                size={18}
                align="center"
                containerStyle={{ marginBottom: 18 }}
              />
            </>
          ) : null}
          {renderBody(pageText)}
        </LetterheadPage>
      ))}
    </PdfDocument>
  );

  const buffer = await renderToBuffer(pdf);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="document-${doc.docNumber.replace(/[^0-9A-Za-z]/g, "-")}.pdf"`,
    },
  });
}
