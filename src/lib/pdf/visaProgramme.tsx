// البرنامج المفصّل لملف الفيزا الصحراوية — PDF بنفس تخطيط نموذج المديرية الرسمي
// الذي كان يُملأ ويُصدَّر Word (والصورتان مأخوذتان منه إلى templates/assets):
//   • ترويسة الجمهورية ووزارة السياحة أعلى الصفحة الأولى
//   • شعار الوزارة علامةً مائية باهتة في وسط كل صفحة
//   • عنوان المديرية، ثم عنوان البرنامج، ثم جدول البيانات وتفصيل البرنامج
//   • ختم الوكالة أعلى يمين الصفحة الأولى، و«Page X sur Y» أسفل كل صفحة
// ليس ورق الشركة: هو نموذج إداري يُقدَّم للمديرية فيبقى بشكلها هي.
import fs from "fs";
import path from "path";
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { VisaApplication, VisaTraveler } from "@prisma/client";
import { registerArabicFonts } from "./letterhead";
import { MixedText } from "./MixedText";

type App = VisaApplication & { travelers: VisaTraveler[] };

registerArabicFonts();

function fmtFr(date: Date): string {
  // التواريخ مخزَّنة عند منتصف ليل UTC — نقرأها UTC حتى لا ينزاح اليوم
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${date.getUTCFullYear()}`;
}

function readAsset(name: string): Buffer | null {
  try {
    return fs.readFileSync(path.join(process.cwd(), "templates", "assets", name));
  } catch {
    return null;
  }
}

// القياسات من النموذج الأصلي (سم → نقطة: × 28.35)
const CM = 28.35;
const MARGIN = 2.5 * CM;

const s = StyleSheet.create({
  page: {
    fontFamily: "Tajawal",
    fontSize: 12,
    color: "#000000",
    paddingTop: MARGIN,
    paddingBottom: MARGIN,
    paddingHorizontal: MARGIN,
  },
  // ترويسة الجمهورية/الوزارة: 15.8 × 3 سم، محاذاة يمين الهامش
  banner: {
    position: "absolute",
    top: 0.9 * CM,
    right: MARGIN,
    width: 15.8 * CM,
    height: 3 * CM,
    objectFit: "contain",
  },
  // شعار الوزارة علامةً مائية: 16 سم في وسط الصفحة وباهت جداً
  watermark: {
    position: "absolute",
    top: (29.7 * CM - 16 * CM) / 2,
    left: (21 * CM - 16 * CM) / 2,
    width: 16 * CM,
    height: 16 * CM,
    opacity: 0.1,
  },
  // ختم الوكالة: ~3.3 سم أعلى يمين منطقة النص في الصفحة الأولى
  stamp: {
    position: "absolute",
    top: MARGIN + 2.2 * CM,
    right: MARGIN,
    width: 3.3 * CM,
    height: 3.3 * CM,
    objectFit: "contain",
  },
  // مساحة ترويسة الوزارة في الصفحة الأولى وحدها (الحشوة ثابتة لكل الصفحات)
  bannerSpace: { height: 2.2 * CM },
  direction: { fontWeight: "bold", textDecoration: "underline", marginBottom: 2 },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    textDecoration: "underline",
    textAlign: "center",
  },
  titleBlock: { marginTop: 22, marginBottom: 20 },
  table: { borderTop: "1px solid #000", borderLeft: "1px solid #000" },
  row: { flexDirection: "row" },
  cell: { borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: 6, justifyContent: "center" },
  label: { width: 7.24 * CM, fontWeight: "bold" },
  value: { flex: 1, textAlign: "center" },
  programCell: { borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: 8 },
  programTitle: { fontWeight: "bold", textDecoration: "underline", marginBottom: 6 },
  programLine: { marginBottom: 2 },
  blankLine: { height: 8 },
  footer: {
    position: "absolute",
    bottom: 1.2 * CM,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 10,
  },
});

export async function renderVisaProgrammePdf(app: App, stamp: Buffer | null): Promise<Buffer> {
  const banner = readAsset("visa-header.png");
  const emblem = readAsset("visa-emblem.jpg");

  const nights = Math.max(Math.round((app.departureDate.getTime() - app.arrivalDate.getTime()) / 86400000), 0);

  const rows: [string, string][] = [
    ["Date d’arrivée", fmtFr(app.arrivalDate)],
    ["Date de départ", fmtFr(app.departureDate)],
    ["Wilayas concernées", app.wilayasConcernees ?? ""],
    ["Nombre de touristes", String(app.travelers.length)],
    ["Durée du séjour", `${nights + 1} jours / ${nights} nuits`],
  ];

  // البرنامج نص متعدد الأسطر: كل سطر فقرة، والسطر الفارغ مسافة
  const programLines = (app.programDetail ?? "").replace(/\r\n/g, "\n").split("\n");

  const doc = (
    <Document title={`Programme ${app.refNumber}`}>
      <Page size="A4" style={s.page}>
        {/* العلامة المائية على كل صفحة، خلف النص */}
        {emblem ? (
          // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image
          <Image src={emblem} style={s.watermark} fixed />
        ) : null}

        {/* ترويسة الوزارة في الصفحة الأولى فقط (كما في النموذج: ترويسة الصفحة الأولى) */}
        {banner ? (
          // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image
          <Image src={banner} style={s.banner} />
        ) : null}

        {stamp ? (
          // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image
          <Image src={stamp} style={s.stamp} />
        ) : null}

        <View style={s.bannerSpace} />
        <Text style={s.direction}>Direction du Tourisme et de</Text>
        <Text style={s.direction}>L’Artisanat de la Wilaya de : {app.wilaya ?? ""}</Text>

        <View style={s.titleBlock}>
          <Text style={s.title}>Programme Détaillé de visite</Text>
          <Text style={s.title}>d’un groupe de touristes</Text>
        </View>

        <View style={s.table}>
          {rows.map(([label, value]) => (
            <View key={label} style={s.row} wrap={false}>
              <Text style={[s.cell, s.label]}>{label}</Text>
              <View style={[s.cell, s.value]}>
                <MixedText text={value} size={12} align="center" baseDir="ltr" />
              </View>
            </View>
          ))}
          <View style={s.programCell}>
            <Text style={s.programTitle}>Détail du programme :</Text>
            {programLines.map((line, i) =>
              line.trim() === "" ? (
                <View key={i} style={s.blankLine} />
              ) : (
                <MixedText key={i} text={line} size={12} baseDir="ltr" containerStyle={s.programLine} />
              )
            )}
          </View>
        </View>

        <Text
          style={s.footer}
          fixed
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} sur ${totalPages}`}
        />
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
