// عرض نص مختلط (عربي + لاتيني/أرقام) بترتيب اتجاهات صحيح داخل PDF.
//
// محرك @react-pdf/renderer لا ينفّذ خوارزمية Unicode Bidi على مستوى الفقرة،
// فتظهر الجمل المختلطة (عربي وإنجليزي معاً) بترتيب معكوس عند التفاف الأسطر.
// الحل هنا: نقسّم الفقرة إلى كلمات، نحدد اتجاه كل كلمة (قوي عربي / قوي لاتيني /
// محايد يرث ما قبله)، ندمج الكلمات ذات الاتجاه المعاكس المتتالية في مقطع واحد
// (ليبقى ترتيبها الداخلي سليماً)، ثم نصفّ المقاطع في صف flex باتجاه الفقرة
// الأساسي مع السماح بالالتفاف — فيلتف السطر كلمةً كلمة بالترتيب الصحيح للاتجاهين.
import { Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/stylesheet";

const RTL_CHAR = /[֐-׿؀-ۿ܀-ݏݐ-ݿࢠ-ࣿיִ-﷿ﹰ-﻿]/;
const LTR_CHAR = /[A-Za-zÀ-ɏͰ-ϿЀ-ӿ]/;

type Dir = "rtl" | "ltr";

function wordDir(word: string): Dir | "neutral" {
  for (const ch of word) {
    if (RTL_CHAR.test(ch)) return "rtl";
    if (LTR_CHAR.test(ch)) return "ltr";
  }
  return "neutral";
}

// الأقواس ونحوها تُعكس شكلها في السياق العربي (خوارزمية Bidi mirroring)
const MIRROR: Record<string, string> = {
  "(": ")", ")": "(",
  "[": "]", "]": "[",
  "{": "}", "}": "{",
  "«": "»", "»": "«",
  "<": ">", ">": "<",
};

// محرك @react-pdf لا ينفّذ Bidi داخل مقطع النص الواحد: فعلامة الترقيم الملتصقة
// بآخر كلمة عربية تُرسم على اليمين (بداية السطر) بدل اليسار (نهايته)، والعكس
// بالعكس. الحل: ننقل ترقيم الطرفين إلى الطرف المقابل ونعكس شكل الأقواس،
// فتظهر في موضعها الصحيح بصرياً.
export function fixRtlEdgePunct(seg: string): string {
  const m = seg.match(/^([^\p{L}\p{N}]*)([\s\S]*?)([^\p{L}\p{N}]*)$/u);
  if (!m) return seg;
  const [, lead, core, trail] = m;
  if (!core) return seg;
  const flip = (s: string) =>
    [...s].map((c) => MIRROR[c] ?? c).reverse().join("");
  return flip(trail) + core + flip(lead);
}

export function detectBaseDir(text: string): Dir {
  let rtl = 0;
  let ltr = 0;
  for (const ch of text) {
    if (RTL_CHAR.test(ch)) rtl++;
    else if (LTR_CHAR.test(ch)) ltr++;
  }
  // نص بلا حروف قوية (هاتف، رقم مرجعي، تاريخ، مبلغ) يُكتب دائماً من اليسار لليمين
  // حتى داخل مستند عربي — وإلا انعكس ترتيب مجموعاته (‎+213 659 530 210).
  if (rtl === 0 && ltr === 0) return "ltr";
  return ltr > rtl ? "ltr" : "rtl";
}

// يعيد مقاطع بالترتيب المنطقي: كلمات الاتجاه الأساسي كلمةً كلمة (لتلتف بحرية)،
// وكل سلسلة كلمات بالاتجاه المعاكس مدموجة في مقطع واحد يحفظ ترتيبها الداخلي
function segment(text: string, base: Dir): { text: string; isBase: boolean }[] {
  const words = text.split(/\s+/).filter(Boolean);
  const dirs: Dir[] = [];
  let prev: Dir = base;
  for (const w of words) {
    const d = wordDir(w);
    const resolved = d === "neutral" ? prev : d;
    dirs.push(resolved);
    prev = resolved;
  }

  const segments: { text: string; isBase: boolean }[] = [];
  let i = 0;
  while (i < words.length) {
    if (dirs[i] === base) {
      segments.push({ text: words[i], isBase: true });
      i++;
    } else {
      const run: string[] = [];
      while (i < words.length && dirs[i] !== base) {
        run.push(words[i]);
        i++;
      }
      segments.push({ text: run.join(" "), isBase: false });
    }
  }
  return segments;
}

export function MixedText({
  text,
  style,
  size = 11.5,
  align = "auto",
  baseDir = "auto",
  containerStyle,
}: {
  text: string;
  style?: Style | Style[];
  size?: number; // حجم الخط — تُشتق منه المسافة الموحدة بين الكلمات
  align?: "auto" | "right" | "left" | "center";
  // إجبار اتجاه الفقرة الأساسي (مفيد للمستندات الفرنسية حتى تبقى الأرقام والهواتف من اليسار)
  baseDir?: "auto" | "ltr" | "rtl";
  containerStyle?: Style;
}) {
  const base = baseDir === "auto" ? detectBaseDir(text) : baseDir;
  const segments = segment(text, base);
  const textStyles = Array.isArray(style) ? style : style ? [style] : [];

  let justifyContent: "flex-start" | "flex-end" | "center" = "flex-start";
  if (align === "center") justifyContent = "center";
  else if (align === "right") justifyContent = base === "rtl" ? "flex-start" : "flex-end";
  else if (align === "left") justifyContent = base === "rtl" ? "flex-end" : "flex-start";

  return (
    <View
      style={[
        {
          flexDirection: base === "rtl" ? "row-reverse" : "row",
          flexWrap: "wrap",
          justifyContent,
          columnGap: size * 0.26,
        },
        ...(containerStyle ? [containerStyle] : []),
      ]}
    >
      {segments.map((seg, i) => (
        <Text key={i} style={textStyles}>
          {base === "rtl" && seg.isBase ? fixRtlEdgePunct(seg.text) : seg.text}
        </Text>
      ))}
    </View>
  );
}
