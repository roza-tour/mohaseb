// المبالغ تُخزَّن كأرقام عشرية، وجمع عدة دفعات يُنتج كسراً دقيقاً جداً (مثل 2e-16)
// يجعل رحلة مدفوعة بالكامل تظهر وكأن عليها متبقٍّ — في القوائم وفي تذكير المستحقات.
// نقرّب لأقرب سنتيم قبل أي مقارنة أو عرض.
export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// مواقع الوكالة في تذييل المستندات.
// الحقل يقبل أكثر من موقع مفصولة بفاصلة أو سطر أو مسافة، وتُعرض بلا
// https:// ولا شرطة أخيرة — الرابط الكامل يطيل السطر ولا يضيف شيئاً مطبوعاً.
export function websiteList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[\s,;|]+/)) {
    const clean = part.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    if (clean === "" || seen.has(clean.toLowerCase())) continue;
    seen.add(clean.toLowerCase());
    out.push(clean);
  }
  return out;
}

export function formatCurrency(amount: number, currency = "DZD") {
  return `${amount.toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  // نقرأ الحقل بتوقيت UTC (نفس طريقة تخزينه) حتى لا ينزاح اليوم على سيرفرات بمناطق زمنية مختلفة
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "UTC" });
}

export function formatDateForInput(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

// اسم بديل عندما يكون الحقل فارغاً (الأسماء صارت اختيارية وتُخزَّن "" لا null،
// فحارس `?? "—"` لا يلتقطها). يُستخدم في المستندات والقوائم.
export function nameOr(s: string | null | undefined, fallback = "—") {
  return s && s.trim() !== "" ? s : fallback;
}
