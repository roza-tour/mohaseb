// استبدال متغيرات قوالب المستندات بقيم فعلية من الرحلة والعميل والإعدادات.
// المتغيرات بأقواس مربعة لاتينية حتى تبقى واضحة داخل النص العربي.
import type { Customer, Settings, TourProgram, Trip } from "@prisma/client";

export const TEMPLATE_VARIABLES: { token: string; label: string }[] = [
  { token: "[CLIENT]", label: "اسم العميل" },
  { token: "[PROGRAM]", label: "اسم البرنامج السياحي" },
  { token: "[START_DATE]", label: "تاريخ بداية الرحلة" },
  { token: "[END_DATE]", label: "تاريخ نهاية الرحلة" },
  { token: "[DURATION]", label: "مدة البرنامج بالأيام" },
  { token: "[PAX]", label: "عدد الأشخاص" },
  { token: "[CONSULATE]", label: "اسم القنصلية (للدعوة)" },
  { token: "[PASSPORT]", label: "رقم جواز السفر (للدعوة)" },
  { token: "[ITINERARY]", label: "تفاصيل مخطط الرحلة (من البرنامج)" },
  { token: "[TODAY]", label: "تاريخ اليوم" },
  { token: "[AGENCY]", label: "اسم الوكالة" },
];

// فاصل صفحات داخل نص المستند: سطر مستقل بهذه العلامة يبدأ صفحة جديدة في الـ PDF
export const PAGE_BREAK = "---PAGE---";

function fmt(date: Date) {
  // تواريخ الرحلة تُخزَّن عند منتصف ليل UTC — نقرأها بتوقيت UTC حتى لا ينزاح اليوم
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

export function fillTemplate(
  body: string,
  ctx: {
    trip?: (Trip & { program: TourProgram; customer: Customer }) | null;
    customer?: Customer | null;
    settings?: Settings | null;
    consulate?: string | null;
    passport?: string | null;
  }
): string {
  const customer = ctx.customer ?? ctx.trip?.customer ?? null;
  const replacements: Record<string, string> = {
    "[CLIENT]": customer?.name?.trim() || "[CLIENT]",
    "[PROGRAM]": ctx.trip?.program.name?.trim() || "[PROGRAM]",
    "[START_DATE]": ctx.trip ? fmt(ctx.trip.startDate) : "[START_DATE]",
    "[END_DATE]": ctx.trip ? fmt(ctx.trip.endDate) : "[END_DATE]",
    "[DURATION]": ctx.trip ? String(ctx.trip.program.durationDays) : "[DURATION]",
    "[PAX]": ctx.trip ? String(ctx.trip.numPax) : "[PAX]",
    // اسم القنصلية ورقم الجواز يُملآن من حقلين مستقلين عند الإصدار
    "[CONSULATE]": ctx.consulate?.trim() || "[CONSULATE]",
    "[PASSPORT]": ctx.passport?.trim() || "[PASSPORT]",
    // مخطط الرحلة يُملأ من تفاصيل برنامج الرحلة المرتبطة
    "[ITINERARY]": ctx.trip?.program.itinerary?.trim() || "[ITINERARY]",
    "[TODAY]": fmt(new Date()),
    "[AGENCY]": ctx.settings?.agencyName ?? "[AGENCY]",
  };

  let result = body;
  for (const [token, value] of Object.entries(replacements)) {
    result = result.split(token).join(value);
  }
  return result;
}

// رقم تسلسلي للمستند بصيغة السنة/العدّاد، مثال: 2026/0007
export function buildDocNumber(year: number, count: number) {
  return `${year}/${String(count + 1).padStart(4, "0")}`;
}

// ---------- نظام تنسيق المستندات ----------
// يُخزَّن كـ JSON مع كل مستند/قالب، ويتحكم في حجم الخط والألوان
// وتباعد الأسطر والمحاذاة وإطار النص — دون الحاجة لتعديل الكود.

export type DocumentStyle = {
  fontSize: number; // حجم خط النص الأساسي (نقاط)
  lineHeight: number; // تباعد الأسطر
  align: "right" | "center"; // محاذاة الفقرات
  textColor: string; // لون النص الأساسي
  accentColor: string; // لون العناوين الفرعية والإطار والخط الفاصل
  bodyBorder: boolean; // إطار حول نص المستند
};

export const DEFAULT_DOC_STYLE: DocumentStyle = {
  fontSize: 11.5,
  lineHeight: 1.7,
  align: "right",
  textColor: "#0f172a",
  accentColor: "#1f3864",
  bodyBorder: false,
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function parseDocStyle(raw: unknown): DocumentStyle {
  const src = (raw ?? {}) as Partial<DocumentStyle>;
  const fontSize = Number(src.fontSize);
  const lineHeight = Number(src.lineHeight);
  return {
    fontSize: fontSize >= 8 && fontSize <= 22 ? fontSize : DEFAULT_DOC_STYLE.fontSize,
    lineHeight: lineHeight >= 1.2 && lineHeight <= 2.5 ? lineHeight : DEFAULT_DOC_STYLE.lineHeight,
    align: src.align === "center" ? "center" : "right",
    textColor: typeof src.textColor === "string" && HEX_RE.test(src.textColor) ? src.textColor : DEFAULT_DOC_STYLE.textColor,
    accentColor:
      typeof src.accentColor === "string" && HEX_RE.test(src.accentColor) ? src.accentColor : DEFAULT_DOC_STYLE.accentColor,
    bodyBorder: Boolean(src.bodyBorder),
  };
}

// يقرأ حقول التنسيق من FormData (تشترك فيها نماذج المستند والقالب)
export function docStyleFromForm(formData: FormData): DocumentStyle {
  return parseDocStyle({
    fontSize: Number(formData.get("styleFontSize")),
    lineHeight: Number(formData.get("styleLineHeight")),
    align: formData.get("styleAlign"),
    textColor: formData.get("styleTextColor"),
    accentColor: formData.get("styleAccentColor"),
    bodyBorder: formData.get("styleBodyBorder") === "on",
  });
}

// سطور خاصة داخل نص المستند:
//   "# عنوان"   → عنوان فرعي كبير بلون التمييز
//   "## عنوان"  → عنوان فرعي أصغر
//   "---"       → خط فاصل
export type BodyLine =
  | { kind: "h1"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "divider" }
  | { kind: "paragraph"; text: string };

export function parseBodyLines(body: string): BodyLine[] {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line): BodyLine => {
      if (line === "---") return { kind: "divider" };
      if (line.startsWith("## ")) return { kind: "h2", text: line.slice(3).trim() };
      if (line.startsWith("# ")) return { kind: "h1", text: line.slice(2).trim() };
      return { kind: "paragraph", text: line };
    });
}
