import { Document, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { LetterheadPage, registerArabicFonts, loadPublicImage } from "@/lib/pdf/letterhead";
import { MixedText } from "@/lib/pdf/MixedText";
import { RefBar, DocTitle, SectionTitle, GridTable, docStyle } from "@/lib/pdf/chrome";
import { settingsDocStyle, type DocumentStyle } from "@/lib/documents";
import { type Lang } from "@/lib/pdf/docLang";
import { makeQrPng, docQrText } from "@/lib/qr";
import { nameOr, websiteList } from "@/lib/format";
import { findTaskOrder } from "@/lib/taskOrderView";
import {
  TASK_FIELDS,
  GROUP_TITLES,
  displayValue,
  readFields,
  readExtraRows,
  type FieldGroup,
  type FieldValues,
  type ExtraRow,
} from "@/lib/taskOrderFields";

registerArabicFonts();

function fmt(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getUTCFullYear()}`;
}

// رقم مرجعي قصير مقروء مشتق من معرّف السجل (لا يوجد حقل ترقيم في الجدول)
export function taskOrderRef(id: string, taskDate: Date): string {
  return `${taskDate.getUTCFullYear()}/${id.slice(-6).toUpperCase()}`;
}

const T = {
  ar: {
    title: "أمر تكليف بمهمة",
    orderNo: "رقم الأمر",
    date: "التاريخ",
    tripSection: "بيانات الرحلة",
    assigneeSection: "بيانات المكلَّف",
    program: "البرنامج السياحي",
    client: "العميل",
    pax: "عدد الأشخاص",
    tripStart: "تاريخ بداية الرحلة",
    tripEnd: "تاريخ نهاية الرحلة",
    assignee: "الاسم",
    role: "الصفة",
    phone: "رقم الهاتف",
    taskDate: "تاريخ المهمة",
    detailsTitle: "تفاصيل المهمة",
    GUIDE: "مرشد سياحي",
    DRIVER: "سائق",
  },
  fr: {
    title: "Ordre de Mission",
    orderNo: "N° d'ordre",
    date: "Date",
    tripSection: "Informations du voyage",
    assigneeSection: "Chargé de mission",
    program: "Programme",
    client: "Client",
    pax: "Nombre de personnes",
    tripStart: "Date de début",
    tripEnd: "Date de fin",
    assignee: "Nom",
    role: "Qualité",
    phone: "Téléphone",
    taskDate: "Date de la mission",
    detailsTitle: "Détails de la mission",
    GUIDE: "Guide touristique",
    DRIVER: "Chauffeur",
  },
} as const;

const styles = StyleSheet.create({
  detailsBox: { border: "1px solid #cbd5e1", padding: 12, minHeight: 60 },
});

export type TaskOrderDocData = {
  ref: string;
  taskDate: Date;
  assigneeType: string;
  assigneeName: string;
  assigneePhone: string;
  details: string;
  programName: string;
  customerName: string;
  numPax: number;
  tripStart: Date;
  tripEnd: Date;
  fields: FieldValues;
  extraRows: ExtraRow[];
};

// صفوف مجموعة من الخانات الاختيارية — الفارغ منها لا يظهر
function groupRows(group: FieldGroup, fields: FieldValues, lang: "ar" | "fr"): [string, string][] {
  return TASK_FIELDS.filter((f) => f.group === group && fields[f.key]?.trim()).map(
    (f) => [f[lang], displayValue(f, fields[f.key].trim())] as [string, string],
  );
}

export function buildTaskOrderDoc({
  order,
  settings,
  stamp,
  qr,
  lang,
  style,
}: {
  order: TaskOrderDocData;
  settings: Parameters<typeof LetterheadPage>[0]["settings"];
  stamp: Buffer | null;
  qr: Buffer | null;
  lang: "ar" | "fr";
  style?: DocumentStyle;
}) {
  const t = T[lang];
  const st = docStyle(style);
  const rtl = lang === "ar";
  const align = rtl ? ("right" as const) : ("left" as const);
  const baseDir = rtl ? ("auto" as const) : ("ltr" as const);

  const tripRows: [string, string][] = [
    [t.program, nameOr(order.programName)],
    [t.client, nameOr(order.customerName)],
    [t.pax, String(order.numPax)],
    [t.tripStart, fmt(order.tripStart)],
    [t.tripEnd, fmt(order.tripEnd)],
  ];
  const assigneeRows: [string, string][] = [
    [t.assignee, nameOr(order.assigneeName)],
    [
      t.role,
      order.assigneeType === "GUIDE" ? t.GUIDE : order.assigneeType === "DRIVER" ? t.DRIVER : order.assigneeType,
    ],
    [t.phone, order.assigneePhone || "—"],
    [t.taskDate, fmt(order.taskDate)],
  ];
  // بيانات المركبة للسائق، وبيانات الاعتماد للمرشد
  const roleGroup: FieldGroup = order.assigneeType === "DRIVER" ? "vehicle" : "guide";
  const roleRows = groupRows(roleGroup, order.fields, lang);
  const missionRows = groupRows("mission", order.fields, lang);
  const details = order.details.trim();
  const extraRows: [string, string][] = order.extraRows.map((r) => [r.label.trim() || "—", r.value.trim()]);

  return (
    <Document>
      <LetterheadPage settings={settings} stamp={stamp} qr={qr}>
        <RefBar number={`${t.orderNo} ${order.ref}`} date={fmt(order.taskDate)} rtl={rtl} style={style} />
        <DocTitle text={t.title} rtl={rtl} style={style} />

        <SectionTitle text={t.assigneeSection} rtl={rtl} style={style} />
        <GridTable rows={assigneeRows} rtl={rtl} baseDir={baseDir} style={style} />

        {roleRows.length > 0 && (
          // wrap={false}: العنوان لا ينفصل عن جدوله في آخر الصفحة
          <View wrap={false}>
            <SectionTitle text={GROUP_TITLES[roleGroup][lang]} rtl={rtl} style={style} />
            <GridTable rows={roleRows} rtl={rtl} baseDir={baseDir} style={style} />
          </View>
        )}

        <SectionTitle text={t.tripSection} rtl={rtl} style={style} />
        <GridTable rows={tripRows} rtl={rtl} baseDir={baseDir} style={style} />

        {missionRows.length > 0 && (
          <View wrap={false}>
            <SectionTitle text={GROUP_TITLES.mission[lang]} rtl={rtl} style={style} />
            <GridTable rows={missionRows} rtl={rtl} baseDir={baseDir} style={style} />
          </View>
        )}

        {extraRows.length > 0 && (
          <View wrap={false}>
            <SectionTitle text={GROUP_TITLES.extra[lang]} rtl={rtl} style={style} />
            <GridTable rows={extraRows} rtl={rtl} baseDir={baseDir} style={style} />
          </View>
        )}

        {/* تفاصيل المهمة تظهر فقط إن كُتبت — والقصيرة منها لا تنقسم بين صفحتين */}
        {details && (
          <View wrap={details.length > 800}>
            <SectionTitle text={t.detailsTitle} rtl={rtl} style={style} />
            <View style={styles.detailsBox}>
              {details
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line, i) => (
                  <MixedText
                    key={i}
                    text={line}
                    size={st.fontSize}
                    align={align}
                    baseDir={baseDir}
                    containerStyle={{ marginBottom: 3 }}
                    style={{
                      fontSize: st.fontSize,
                      lineHeight: st.lineHeight,
                      color: st.textColor,
                    }}
                  />
                ))}
            </View>
          </View>
        )}
      </LetterheadPage>
    </Document>
  );
}

export async function renderTaskOrderPdf(
  id: string,
  lang: "ar" | "fr",
): Promise<{ buffer: Buffer; ref: string } | null> {
  // قراءة لا تنكسر: أمر تكليف يشير إلى رحلة محذوفة كان يُفشل توليد الـ PDF بخطأ خادم
  const taskOrder = await findTaskOrder(id);
  if (!taskOrder) return null;
  const trip = taskOrder.tripInfo;

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const stamp = loadPublicImage(settings?.stampPath);
  const ref = taskOrderRef(taskOrder.id, taskOrder.taskDate);
  const qr = await makeQrPng(
    docQrText({
      agency: settings?.agencyName,
      type: "Ordre de mission",
      number: ref,
      date: fmt(taskOrder.taskDate),
      // رمز التحقق يحمل موقعاً واحداً فقط حتى لا يتضخّم
      website: websiteList(settings?.agencyWebsite)[0] ?? null,
    }),
  );

  const buffer = await renderToBuffer(
    buildTaskOrderDoc({
      order: {
        ref,
        taskDate: taskOrder.taskDate,
        assigneeType: taskOrder.assigneeType,
        assigneeName: taskOrder.guide?.name ?? taskOrder.driver?.name ?? "",
        assigneePhone: taskOrder.guide?.phone ?? taskOrder.driver?.phone ?? "",
        details: taskOrder.details ?? "",
        programName: trip?.programName ?? "—",
        customerName: trip?.customerName ?? "—",
        numPax: trip?.numPax ?? 0,
        tripStart: trip?.startDate ?? taskOrder.taskDate,
        tripEnd: trip?.endDate ?? taskOrder.taskDate,
        fields: readFields(taskOrder.fields),
        extraRows: readExtraRows(taskOrder.extraRows),
      },
      settings,
      stamp,
      qr,
      lang,
      style: settingsDocStyle(settings),
    }),
  );
  return { buffer, ref };
}

export type { Lang };
