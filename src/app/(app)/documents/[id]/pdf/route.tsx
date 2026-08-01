export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Document as PdfDocument, View, renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { LetterheadPage, registerArabicFonts, loadPublicImage } from "@/lib/pdf/letterhead";
import { MixedText } from "@/lib/pdf/MixedText";
import { parseBodyLines, parseDocStyle, settingsDocStyle, PAGE_BREAK } from "@/lib/documents";
import { makeQrPng, docQrText } from "@/lib/qr";
import { RefBar, DocTitle } from "@/lib/pdf/chrome";

function formatDate(date: Date) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

registerArabicFonts();


export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const stampBuffer = doc.showStamp ? loadPublicImage(settings?.stampPath) : null;
  const qr = await makeQrPng(
    docQrText({ agency: settings?.agencyName, type: "Document", number: doc.docNumber, date: formatDate(doc.docDate), website: settings?.agencyWebsite })
  );

  // تنسيق المستند: ما اختير له تحديداً، وإلا التنسيق العام من الإعدادات
  const style = doc.style ? parseDocStyle(doc.style) : settingsDocStyle(settings);
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
        <LetterheadPage key={p} settings={settings} stamp={stampBuffer} qr={qr}>
          {p === 0 ? (
            <>
              <RefBar number={`N° ${doc.docNumber}`} date={formatDate(doc.docDate)} rtl style={style} />
              {doc.title.trim() ? <DocTitle text={doc.title} rtl style={style} /> : null}
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
