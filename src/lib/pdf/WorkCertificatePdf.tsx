// تصميم شهادة العمل: إطار مزدوج بزخرفة الزوايا، علامة مائية باسم الوكالة،
// عنوان بلغة الشهادة وحدها، جدول بيانات الموظف، وكتلة توقيع وختم في الأسفل.
import { Document as PdfDocument, View, Text, Image } from "@react-pdf/renderer";
import type { Settings } from "@prisma/client";
import { LetterheadPage } from "@/lib/pdf/letterhead";
import { MixedText } from "@/lib/pdf/MixedText";
import {
  certificateRows,
  certificateTitle,
  madeAt,
  signerTitleOf,
  type CertData,
} from "@/lib/workCertificate";

function fmt(d: Date): string {
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getUTCFullYear()}`;
}

// زخرفة زاوية: خطّان متعامدان بلون الوكالة
function Corner({ color, pos }: { color: string; pos: "tl" | "tr" | "bl" | "br" }) {
  const size = 26;
  const t = 3;
  const v = pos[0] === "t" ? { top: -1.5 } : { bottom: -1.5 };
  const h = pos[1] === "l" ? { left: -1.5 } : { right: -1.5 };
  return (
    <View style={{ position: "absolute", width: size, height: size, ...v, ...h }}>
      <View
        style={{
          position: "absolute",
          width: size,
          height: t,
          backgroundColor: color,
          ...(pos[0] === "t" ? { top: 0 } : { bottom: 0 }),
        }}
      />
      <View
        style={{
          position: "absolute",
          width: t,
          height: size,
          backgroundColor: color,
          ...(pos[1] === "l" ? { left: 0 } : { right: 0 }),
        }}
      />
    </View>
  );
}

// جدول بيانات الموظف: تسمية بلون الوكالة الفاتح وقيمة — أسطر مضغوطة لتبقى الشهادة في صفحة
function CertTable({ rows, rtl, color }: { rows: [string, string][]; rtl: boolean; color: string }) {
  const align = rtl ? ("right" as const) : ("left" as const);
  return (
    <View style={{ border: `0.8px solid ${color}` }}>
      {rows.map(([label, value], i) => (
        <View
          key={label}
          style={{
            flexDirection: rtl ? "row-reverse" : "row",
            ...(i > 0 ? { borderTop: "0.6px solid #cbd5e1" } : {}),
          }}
        >
          <View style={{ width: 175, backgroundColor: "#f1f5f9", paddingVertical: 5, paddingHorizontal: 8 }}>
            <Text style={{ fontSize: 10, fontWeight: "bold", color: "#334155", textAlign: align }}>{label}</Text>
          </View>
          <View style={{ flex: 1, paddingVertical: 5, paddingHorizontal: 8 }}>
            <MixedText
              text={value}
              size={10.5}
              align={align}
              baseDir={rtl ? "auto" : "ltr"}
              style={{ fontSize: 10.5, color: "#0f172a", fontWeight: "bold" }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

export function WorkCertificatePdf({
  data,
  body,
  docNumber,
  docDate,
  settings,
  stamp,
  qr,
}: {
  data: CertData;
  body: string;
  docNumber: string;
  docDate: Date;
  settings: Settings | null;
  stamp: Buffer | null;
  qr: Buffer | null;
}) {
  const ar = data.lang === "ar";
  const color = settings?.letterheadColor || "#1f3864";
  const agency = settings?.agencyName?.trim() || "ROZATOUR";
  const dir = ar ? ("row-reverse" as const) : ("row" as const);
  const align = ar ? ("right" as const) : ("left" as const);
  const baseDir = ar ? ("rtl" as const) : ("ltr" as const);
  const title = certificateTitle(data.lang);
  const rows = certificateRows(data, docDate);

  // النص المحفوظ: فقرة المقدمة، ثم الجدول، ثم بقية الفقرات (قابلة للتعديل من صفحة المستند)
  const paras = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const [intro, ...rest] = paras;

  const para = (text: string, key: number | string) => (
    <MixedText
      key={key}
      text={text}
      size={11.5}
      align={align}
      baseDir={baseDir}
      containerStyle={{ marginBottom: 8 }}
      style={{ fontSize: 11.5, lineHeight: 1.6, color: "#1e293b" }}
    />
  );

  return (
    <PdfDocument title={`${title.main} ${docNumber}`}>
      {/* الختم يوضع في كتلة التوقيع لا أعلى الصفحة */}
      <LetterheadPage settings={settings} stamp={null} qr={qr}>
        <View style={{ flexGrow: 1, border: `1.6px solid ${color}`, padding: 4, marginTop: 4 }}>
          <View style={{ flexGrow: 1, border: `0.6px solid ${color}`, paddingVertical: 16, paddingHorizontal: 26 }}>
            <Corner color={color} pos="tl" />
            <Corner color={color} pos="tr" />
            <Corner color={color} pos="bl" />
            <Corner color={color} pos="br" />

            {/* علامة مائية باهتة باسم الوكالة */}
            <View
              style={{ position: "absolute", top: 440, left: 0, right: 0, alignItems: "center" }}
            >
              <Text
                style={{
                  fontSize: 70,
                  color,
                  opacity: 0.05,
                  fontWeight: "bold",
                  letterSpacing: 6,
                  transform: "rotate(-28deg)",
                }}
              >
                {agency.toUpperCase()}
              </Text>
            </View>

            {/* الرقم والتاريخ */}
            <View style={{ flexDirection: dir, justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontSize: 9, color: "#475569" }}>{`N° ${docNumber}`}</Text>
              <Text style={{ fontSize: 9, color: "#475569" }}>{fmt(docDate)}</Text>
            </View>

            {/* العنوان بلغة الشهادة فقط */}
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <MixedText
                text={title.main}
                size={22}
                align="center"
                containerStyle={{ flexWrap: "nowrap" }}
                style={{ fontSize: 22, fontWeight: "bold", color, letterSpacing: ar ? 0 : 2.5 }}
              />
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, marginBottom: 6 }}>
                <View style={{ width: 70, height: 0.8, backgroundColor: color }} />
                <View
                  style={{
                    width: 7,
                    height: 7,
                    backgroundColor: color,
                    transform: "rotate(45deg)",
                    marginHorizontal: 8,
                  }}
                />
                <View style={{ width: 70, height: 0.8, backgroundColor: color }} />
              </View>
            </View>

            {intro ? para(intro, "intro") : null}

            {rows.length > 0 && (
              <View style={{ marginTop: 4, marginBottom: 12 }}>
                <CertTable rows={rows} rtl={ar} color={color} />
              </View>
            )}

            {rest.map((p, i) => para(p, i))}

            {/* كتلة التوقيع والختم — يمين الورقة في الفرنسية، يسارها في العربية */}
            <View style={{ flexGrow: 1 }} />
            <View
              style={{ flexDirection: dir, justifyContent: "space-between", alignItems: "flex-start", marginTop: 8 }}
              wrap={false}
            >
              <MixedText
                text={madeAt(data, docDate)}
                size={10.5}
                align={align}
                baseDir={baseDir}
                containerStyle={{ paddingTop: 2 }}
                style={{ fontSize: 10.5, color: "#334155" }}
              />
              <View style={{ width: 210, alignItems: "center" }}>
                <MixedText
                  text={signerTitleOf(data)}
                  size={11.5}
                  align="center"
                  style={{ fontSize: 11.5, fontWeight: "bold", color }}
                />
                {data.signerName ? (
                  <MixedText
                    text={data.signerName}
                    size={10.5}
                    align="center"
                    containerStyle={{ marginTop: 2 }}
                    style={{ fontSize: 10.5, color: "#1e293b" }}
                  />
                ) : null}
                <View style={{ height: 84, width: 150, alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                  {stamp ? (
                    // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image
                    <Image src={stamp} style={{ width: 84, height: 84, objectFit: "contain" }} />
                  ) : null}
                </View>
                <Text style={{ fontSize: 8, color: "#94a3b8" }}>
                  {ar ? "الإمضاء والختم" : "Signature et cachet"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </LetterheadPage>
    </PdfDocument>
  );
}
