// عناصر التنسيق المشتركة بين المستندات الرسمية (نفس هوية الدعوة):
// شريط المرجع والتاريخ، العنوان داخل إطار، عنوان قسم بخط سفلي، وجدول بيانات.
import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { MixedText } from "./MixedText";

export const NAVY = "#1f3864";

const s = StyleSheet.create({
  refBar: {
    borderBottom: `1px solid ${NAVY}`,
    paddingBottom: 5,
    marginBottom: 16,
    justifyContent: "space-between",
  },
  refText: { fontSize: 9, color: "#475569" },

  titleWrap: { alignItems: "center", marginBottom: 18 },
  titleBox: {
    borderTop: `2px solid ${NAVY}`,
    borderBottom: `2px solid ${NAVY}`,
    paddingVertical: 6,
    paddingHorizontal: 26,
  },

  sectionRule: { borderBottom: `2px solid ${NAVY}`, width: 60, marginBottom: 10 },

  table: { border: "1px solid #cbd5e1", marginBottom: 16 },
  row: { borderTop: "1px solid #e2e8f0" },
  label: { fontWeight: "bold", color: "#334155", fontSize: 10.5, padding: 7, width: 165 },
  value: { flex: 1, padding: 7 },
});

// شريط علوي: رقم المستند على جهة البداية والتاريخ على جهة النهاية
export function RefBar({ number, date, rtl }: { number: string; date: string; rtl: boolean }) {
  return (
    <View style={[s.refBar, { flexDirection: rtl ? "row-reverse" : "row" }]}>
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
export function DocTitle({ text, rtl, size = 16 }: { text: string; rtl: boolean; size?: number }) {
  return (
    <View style={s.titleWrap}>
      <View style={s.titleBox}>
        <MixedText
          text={text}
          size={size}
          align="center"
          baseDir={rtl ? "auto" : "ltr"}
          style={{ fontWeight: "bold", color: NAVY, letterSpacing: 0.5 }}
        />
      </View>
    </View>
  );
}

// عنوان قسم يتبعه خط قصير
export function SectionTitle({ text, rtl }: { text: string; rtl: boolean }) {
  const align = rtl ? ("right" as const) : ("left" as const);
  return (
    <>
      <MixedText
        text={text}
        size={12}
        align={align}
        baseDir={rtl ? "auto" : "ltr"}
        containerStyle={{ marginBottom: 3 }}
        style={{ fontWeight: "bold", color: NAVY }}
      />
      <View style={[s.sectionRule, { alignSelf: rtl ? "flex-end" : "flex-start" }]} />
    </>
  );
}

// جدول «الحقل: القيمة» بصفوف مُظلَّلة بالتناوب
export function InfoTable({
  rows,
  rtl,
  baseDir,
}: {
  rows: [string, string][];
  rtl: boolean;
  baseDir: "auto" | "ltr";
}) {
  const dir = rtl ? ("row-reverse" as const) : ("row" as const);
  const align = rtl ? ("right" as const) : ("left" as const);
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
          <Text style={[s.label, { textAlign: align }]}>{label}</Text>
          <View style={s.value}>
            <MixedText text={value} size={10.5} align={align} baseDir={baseDir} />
          </View>
        </View>
      ))}
    </View>
  );
}
