import { Document as PdfDocument, View, renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { LetterheadPage, registerArabicFonts, loadPublicImage } from "@/lib/pdf/letterhead";
import { MixedText } from "@/lib/pdf/MixedText";
import { parseBodyLines, parseDocStyle, settingsDocStyle, PAGE_BREAK } from "@/lib/documents";
import { makeQrPng } from "@/lib/qr";
import { genToken, verifyUrl } from "@/lib/share";
import { RefBar, DocTitle } from "@/lib/pdf/chrome";
import { WorkCertificatePdf } from "@/lib/pdf/WorkCertificatePdf";
import { WORK_CERTIFICATE, readCertData } from "@/lib/workCertificate";

function formatDate(date: Date) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

registerArabicFonts();

// يبني ملف المستند PDF (يُستخدم في صفحة المستند وفي رابط التحقق العام عبر QR)
export async function renderDocumentPdf(id: string): Promise<{ buffer: Buffer; docNumber: string } | null> {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return null;

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const stampBuffer = doc.showStamp ? loadPublicImage(settings?.stampPath) : null;
  // رمز رابط عام ثابت للتحقق (يُنشأ مرة واحدة ويُحفظ) — الـ QR يفتح صفحة «CONFIRMED»
  let token = doc.publicToken;
  if (!token) {
    token = genToken();
    await prisma.document.update({ where: { id: doc.id }, data: { publicToken: token } });
  }
  const qr = await makeQrPng(verifyUrl("document", token));

  // شهادة العمل لها تصميمها الخاص (إطار، جدول بيانات، كتلة توقيع وختم)
  const cert = doc.kind === WORK_CERTIFICATE ? readCertData(doc.data) : null;
  if (cert) {
    const buffer = await renderToBuffer(
      <WorkCertificatePdf
        data={cert}
        body={doc.body}
        docNumber={doc.docNumber}
        docDate={doc.docDate}
        settings={settings}
        stamp={stampBuffer}
        qr={qr}
      />
    );
    return { buffer, docNumber: doc.docNumber };
  }

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
  return { buffer, docNumber: doc.docNumber };
}
