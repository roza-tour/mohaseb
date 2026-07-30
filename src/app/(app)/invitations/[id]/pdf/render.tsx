import { Document, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { LetterheadPage, registerArabicFonts, loadPublicImage } from "@/lib/pdf/letterhead";
import { MixedText } from "@/lib/pdf/MixedText";
import { invitationBody, type InvLang, type Person } from "@/lib/invitation";
import { makeQrPng } from "@/lib/qr";
import { genToken, verifyUrl } from "@/lib/share";

registerArabicFonts();

const NAVY = "#1f3864";

function fmt(date: Date | null | undefined) {
  if (!date) return "";
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${date.getUTCFullYear()}`;
}

const styles = StyleSheet.create({
  // شريط المرجع والتاريخ أعلى الخطاب
  refBar: {
    borderBottom: `1px solid ${NAVY}`,
    paddingBottom: 5,
    marginBottom: 16,
    justifyContent: "space-between",
  },
  refText: { fontSize: 9, color: "#475569" },

  // العنوان الرئيسي داخل إطار
  titleWrap: { alignItems: "center", marginBottom: 18 },
  titleBox: {
    borderTop: `2px solid ${NAVY}`,
    borderBottom: `2px solid ${NAVY}`,
    paddingVertical: 6,
    paddingHorizontal: 26,
  },

  // صندوق الموضوع
  subjectBox: {
    backgroundColor: "#f1f5f9",
    borderLeft: `3px solid ${NAVY}`,
    borderRight: `3px solid ${NAVY}`,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 14,
  },

  // جدول الأشخاص
  peopleTitle: { fontSize: 10.5, fontWeight: "bold", color: NAVY, marginBottom: 5 },
  tableWrap: { border: "1px solid #cbd5e1", marginBottom: 14 },
  thead: { backgroundColor: NAVY },
  th: { color: "#ffffff", fontSize: 9.5, fontWeight: "bold", padding: 5 },
  td: { fontSize: 10, padding: 5 },
  colN: { width: "12%", textAlign: "center" },
  colName: { width: "53%" },
  colPass: { width: "35%", textAlign: "center" },

  // كتلة التوقيع
  signBlock: { marginTop: 16 },
  signName: { fontSize: 11.5, fontWeight: "bold", color: NAVY },
  signRule: { borderTop: "1px solid #94a3b8", width: 150, marginTop: 4, paddingTop: 4 },

  // صفحة المخطط
  sectionTitle: { fontSize: 14, fontWeight: "bold", color: NAVY, marginBottom: 3 },
  sectionRule: { borderBottom: `2px solid ${NAVY}`, width: 60, marginBottom: 12 },
  itineraryBox: { border: "1px solid #cbd5e1", padding: 12 },
});

export type InvitationDocData = {
  refNumber: string;
  docDate: Date;
  language: string;
  consulate: string;
  people: Person[];
  programName: string;
  itinerary: string;
  arrivalDate: Date | null;
  departureDate: Date | null;
};

// يبني مستند الدعوة (JSX) من بيانات جاهزة — منفصل عن قاعدة البيانات ليسهل معاينته واختباره
export function buildInvitationDoc({
  inv,
  settings,
  stamp,
  qr,
}: {
  inv: InvitationDocData;
  settings: Parameters<typeof LetterheadPage>[0]["settings"];
  stamp: Buffer | null;
  qr: Buffer | null;
}) {
  const lang = (["ar", "fr", "en"].includes(inv.language) ? inv.language : "fr") as InvLang;
  const rtl = lang === "ar";
  const align = rtl ? ("right" as const) : ("left" as const);
  const baseDir = rtl ? ("auto" as const) : ("ltr" as const);
  const rowDir = rtl ? ("row-reverse" as const) : ("row" as const);

  const people = (Array.isArray(inv.people) ? inv.people : []) as Person[];
  const t = invitationBody(lang, {
    consulate: inv.consulate || "",
    agency: settings?.agencyName?.trim() || "ROZATOUR",
    people,
    program: inv.programName || "",
    arrival: fmt(inv.arrivalDate),
    departure: fmt(inv.departureDate),
    today: fmt(inv.docDate),
  });

  const itinerary = inv.itinerary.trim();

  // فقرة نصية بمحاذاة اللغة ومسافة أسفلها
  const Para = ({ text, size = 11.5, bold = false }: { text: string; size?: number; bold?: boolean }) => (
    <MixedText
      text={text}
      size={size}
      align={align}
      baseDir={baseDir}
      containerStyle={{ marginBottom: 7 }}
      style={{ lineHeight: 1.45, ...(bold ? { fontWeight: "bold" } : {}) }}
    />
  );

  const renderLines = (text: string) =>
    text
      .split(/\r?\n/)
      .map((l) => l.replace(/\s+$/, ""))
      .map((line, i) =>
        line.trim() === "" ? (
          <View key={i} style={{ height: 6 }} />
        ) : (
          <MixedText
            key={i}
            text={line}
            size={11}
            align={align}
            baseDir={baseDir}
            containerStyle={{ marginBottom: 3 }}
            style={{ lineHeight: 1.5 }}
          />
        )
      );

  return (
    <Document>
      {/* ---------- الصفحة الأولى: خطاب الدعوة ---------- */}
      <LetterheadPage settings={settings} stamp={stamp} qr={qr}>
        <View style={[styles.refBar, { flexDirection: rowDir }]}>
          <Text style={styles.refText}>N° {inv.refNumber}</Text>
          <Text style={styles.refText}>{fmt(inv.docDate)}</Text>
        </View>

        <View style={styles.titleWrap}>
          <View style={styles.titleBox}>
            <MixedText
              text={t.title}
              size={16}
              align="center"
              baseDir={baseDir}
              style={{ fontWeight: "bold", color: NAVY, letterSpacing: 0.5 }}
            />
          </View>
        </View>

        <Para text={t.recipient} bold />

        <View style={styles.subjectBox}>
          <MixedText
            text={`${t.subjectLabel} : ${t.subject}`}
            size={11}
            align={align}
            baseDir={baseDir}
            style={{ fontWeight: "bold", color: NAVY }}
          />
        </View>

        <Para text={t.salutation} />
        <Para text={t.intro} />

        {/* جدول الأشخاص المعنيين — لا يُقسَّم بين صفحتين */}
        {people.length > 0 && (
          <View wrap={false}>
            <MixedText
              text={t.peopleTitle}
              size={10.5}
              align={align}
              baseDir={baseDir}
              containerStyle={{ marginBottom: 5 }}
              style={{ fontWeight: "bold", color: NAVY }}
            />
            <View style={styles.tableWrap}>
              <View style={[styles.thead, { flexDirection: rowDir }]}>
                <Text style={[styles.th, styles.colN]}>{t.cols.n}</Text>
                <Text style={[styles.th, styles.colName, { textAlign: align }]}>{t.cols.name}</Text>
                <Text style={[styles.th, styles.colPass]}>{t.cols.passport}</Text>
              </View>
              {people.map((p, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: rowDir,
                    borderTop: "1px solid #e2e8f0",
                    backgroundColor: i % 2 ? "#f8fafc" : "#ffffff",
                  }}
                >
                  <Text style={[styles.td, styles.colN]}>{i + 1}</Text>
                  <View style={[styles.td, styles.colName]}>
                    <MixedText text={p.name} size={10} align={align} baseDir={baseDir} />
                  </View>
                  <Text style={[styles.td, styles.colPass]}>{p.passport?.trim() || "—"}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {t.paras.map((p, i) => (
          <Para key={i} text={p} />
        ))}

        <Para text={t.closing} />

        {/* التوقيع — كتلة واحدة لا تنقسم بين صفحتين (وإلا ظهرت صفحة شبه فارغة) */}
        <View wrap={false} style={[styles.signBlock, { alignItems: rtl ? "flex-start" : "flex-end" }]}>
          <Text style={[styles.refText, { textAlign: align }]}>{t.doneOn}</Text>
          <View style={styles.signRule}>
            <MixedText text={t.agency} size={11.5} align="center" baseDir={baseDir} style={{ fontWeight: "bold", color: NAVY }} />
          </View>
        </View>
      </LetterheadPage>

      {/* ---------- الصفحة الثانية: مخطط الرحلة ---------- */}
      <LetterheadPage settings={settings} stamp={stamp} qr={qr}>
        <View style={[styles.refBar, { flexDirection: rowDir }]}>
          <Text style={styles.refText}>N° {inv.refNumber}</Text>
          <Text style={styles.refText}>{fmt(inv.docDate)}</Text>
        </View>

        <MixedText
          text={t.itineraryTitle}
          size={14}
          align={align}
          baseDir={baseDir}
          containerStyle={{ marginBottom: 3 }}
          style={{ fontWeight: "bold", color: NAVY }}
        />
        <View style={[styles.sectionRule, { alignSelf: rtl ? "flex-end" : "flex-start" }]} />

        <View style={styles.itineraryBox}>
          {itinerary ? (
            renderLines(itinerary)
          ) : (
            <Text style={{ fontSize: 10.5, color: "#94a3b8", textAlign: align }}>—</Text>
          )}
        </View>
      </LetterheadPage>
    </Document>
  );
}

// يبني ملف الدعوة PDF ويعيد المخزن المؤقت + الرقم المرجعي (يُستخدم للعرض وللإرسال بالبريد)
export async function renderInvitationPdf(
  id: string
): Promise<{ buffer: Buffer; refNumber: string; lang: string } | null> {
  const inv = await prisma.invitation.findUnique({ where: { id }, include: { program: true } });
  if (!inv) return null;

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const stamp = loadPublicImage(settings?.stampPath);

  let token = inv.publicToken;
  if (!token) {
    token = genToken();
    await prisma.invitation.update({ where: { id: inv.id }, data: { publicToken: token } });
  }
  const qr = await makeQrPng(verifyUrl("invitation", token));

  const lang = ["ar", "fr", "en"].includes(inv.language) ? inv.language : "fr";

  const buffer = await renderToBuffer(
    buildInvitationDoc({
      inv: {
        refNumber: inv.refNumber,
        docDate: inv.docDate,
        language: lang,
        consulate: inv.consulate || "",
        people: (Array.isArray(inv.people) ? inv.people : []) as Person[],
        programName: inv.program?.name || "",
        itinerary: (inv.itinerary || inv.program?.itinerary || "").trim(),
        arrivalDate: inv.arrivalDate,
        departureDate: inv.departureDate,
      },
      settings,
      stamp,
      qr,
    })
  );
  return { buffer, refNumber: inv.refNumber, lang };
}
