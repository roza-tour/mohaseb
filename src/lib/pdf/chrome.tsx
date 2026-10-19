// عناصر التنسيق المشتركة بين المستندات الرسمية (نفس هوية الدعوة):
// شريط المرجع والتاريخ، العنوان داخل إطار، عنوان قسم بخط سفلي، وجدول بيانات.
// كل العناصر تأخذ لون التمييز وحجم الخط من تنسيق المستندات في الإعدادات،
// فتغيير التنسيق يدوياً يسري على كل المستندات المولَّدة.
import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { MixedText } from "./MixedText";
import { DEFAULT_DOC_STYLE, type DocumentStyle } from "@/lib/documents";

export const NAVY = DEFAULT_DOC_STYLE.accentColor;

const s = StyleSheet.create({
  refBar: { paddingBottom: 5, marginBottom: 16, justifyContent: "space-between" },
  refText: { fontSize: 9, color: "#475569" },
  titleWrap: { alignItems: "center", marginBottom: 18 },
  titleBox: { paddingVertical: 6, paddingHorizontal: 26 },
  sectionRule: { width: 60, marginBottom: 10 },
  table: { border: "1px solid #cbd5e1", marginBottom: 16 },
  row: { borderTop: "1px solid #e2e8f0" },
  label: { fontWeight: "bold", color: "#334155", padding: 7, width: 165 },
  value: { flex: 1, padding: 7 },
});

// التنسيق الفعّال لمستند: ما اختاره المستخدم وإلا الافتراضي
export function docStyle(style?: Partial<DocumentStyle> | null): DocumentStyle {
  return { ...DEFAULT_DOC_STYLE, ...(style ?? {}) };
}

type Styled = { style?: DocumentStyle };

// شريط علوي: رقم المستند على جهة البداية والتاريخ على جهة النهاية
export function RefBar({
  number,
  date,
  rtl,
  style,
}: { number: string; date: string; rtl: boolean } & Styled) {
  const st = docStyle(style);
  return (
    <View
      style={[
        s.refBar,
        { flexDirection: rtl ? "row-reverse" : "row", borderBottom: `1px solid ${st.accentColor}` },
      ]}
    >
      <MixedText
        text={number}
        size={9}
        align={rtl ? "right" : "left"}
        baseDir={rtl ? "auto" : "ltr"}
        style={s.refText}
      />
      <Text style={s.refText}>{date}</Text>
    </View>
  );
}

// عنوان المستند داخل إطار علوي وسفلي
export function DocTitle({
  text,
  rtl,
  size,
  style,
}: { text: string; rtl: boolean; size?: number } & Styled) {
  const st = docStyle(style);
  const fontSize = size ?? st.fontSize + 4.5;
  return (
    <View style={s.titleWrap}>
      <View
        style={[
          s.titleBox,
          { borderTop: `2px solid ${st.accentColor}`, borderBottom: `2px solid ${st.accentColor}` },
        ]}
      >
        <MixedText
          text={text}
          size={fontSize}
          align="center"
          baseDir={rtl ? "auto" : "ltr"}
          // العنوان يبقى في سطر واحد: الإطار يتمدّد بعرضه بدل أن يلتف النص فوق الحدّ
          containerStyle={{ flexWrap: "nowrap" }}
          style={{ fontSize, fontWeight: "bold", color: st.accentColor, letterSpacing: 0.5 }}
        />
      </View>
    </View>
  );
}

// عنوان قسم يتبعه خط قصير
export function SectionTitle({ text, rtl, style }: { text: string; rtl: boolean } & Styled) {
  const st = docStyle(style);
  const align = rtl ? ("right" as const) : ("left" as const);
  const fontSize = st.fontSize + 0.5;
  return (
    <>
      <MixedText
        text={text}
        size={fontSize}
        align={align}
        baseDir={rtl ? "auto" : "ltr"}
        containerStyle={{ marginBottom: 3 }}
        style={{ fontSize, fontWeight: "bold", color: st.accentColor }}
      />
      <View
        style={[s.sectionRule, { borderBottom: `2px solid ${st.accentColor}`, alignSelf: rtl ? "flex-end" : "flex-start" }]}
      />
    </>
  );
}

// جدول «الحقل: القيمة» بصفوف مُظلَّلة بالتناوب
export function InfoTable({
  rows,
  rtl,
  baseDir,
  style,
}: {
  rows: [string, string][];
  rtl: boolean;
  baseDir: "auto" | "ltr";
} & Styled) {
  const st = docStyle(style);
  const dir = rtl ? ("row-reverse" as const) : ("row" as const);
  const align = rtl ? ("right" as const) : ("left" as const);
  const fontSize = st.fontSize - 1;
  return (
    <View style={s.table}>
      {rows.map(([label, value], i) => (
        <View
          key={`${label}-${i}`}
          style={[
            s.row,
            { flexDirection: dir, backgroundColor: i % 2 ? "#f8fafc" : "#ffffff" },
            ...(i === 0 ? [{ borderTop: "none" }] : []),
          ]}
        >
          <Text style={[s.label, { textAlign: align, fontSize }]}>{label}</Text>
          <View style={s.value}>
            <MixedText
              text={value}
              size={fontSize}
              align={align}
              baseDir={baseDir}
              style={{ fontSize, color: st.textColor }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

// جدول مضغوط: خانتان (اسم + قيمة) في كل سطر — للبيانات الاختيارية القصيرة
// مثل بيانات المركبة، حتى لا يطول المستند. لو كان العدد فردياً يمتد الأخير بعرض السطر.
export function GridTable({
  rows,
  rtl,
  baseDir,
  style,
}: {
  rows: [string, string][];
  rtl: boolean;
  baseDir: "auto" | "ltr";
} & Styled) {
  const st = docStyle(style);
  const dir = rtl ? ("row-reverse" as const) : ("row" as const);
  const align = rtl ? ("right" as const) : ("left" as const);
  const fontSize = st.fontSize - 1;
  const lines: [string, string][][] = [];
  for (let i = 0; i < rows.length; i += 2) lines.push(rows.slice(i, i + 2));
  const divider = rtl ? { borderLeft: "1px solid #e2e8f0" } : { borderRight: "1px solid #e2e8f0" };

  const cell = ([label, value]: [string, string], key: number, full: boolean, last: boolean) => (
    <View key={key} style={[{ flexDirection: dir, width: full ? "100%" : "50%" }, ...(last ? [] : [divider])]}>
      <Text
        // بلا تقطيع للكلمات بشرطة (Nombre de person-nes)
        hyphenationCallback={(word) => [word]}
        style={{
          fontWeight: "bold",
          color: "#334155",
          backgroundColor: "#f8fafc",
          padding: 6,
          width: 120,
          textAlign: align,
          fontSize,
        }}
      >
        {label}
      </Text>
      <View style={{ flex: 1, padding: 6 }}>
        <MixedText
          text={value}
          size={fontSize}
          align={align}
          baseDir={baseDir}
          style={{ fontSize, color: st.textColor }}
        />
      </View>
    </View>
  );

  return (
    <View style={s.table}>
      {lines.map((pair, i) => (
        <View key={i} style={[s.row, { flexDirection: dir }, ...(i === 0 ? [{ borderTop: "none" }] : [])]}>
          {pair.map((r, j) => cell(r, j, pair.length === 1, j === pair.length - 1))}
        </View>
      ))}
    </View>
  );
}
