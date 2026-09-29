// قائمة العملات الموحَّدة لكل شاشات البرنامج.
// كانت مكرَّرة في سبعة ملفات بترتيب مختلف، فإضافة عملة واحدة كانت تعني
// تعديل سبعة أماكن ونسيان واحد منها يجعل العملة تظهر في شاشة دون أخرى.
export const CURRENCIES = ["DZD", "EUR", "USD", "GBP", "TND", "MAD", "SAR"] as const;

export type Currency = (typeof CURRENCIES)[number];

// الاسم العربي الكامل — يُعرض حيث تتسع المساحة (مثل الإعدادات)
export const CURRENCY_LABELS: Record<string, string> = {
  DZD: "دينار جزائري (DZD)",
  EUR: "يورو (EUR)",
  USD: "دولار أمريكي (USD)",
  GBP: "جنيه إسترليني (GBP)",
  TND: "دينار تونسي (TND)",
  MAD: "درهم مغربي (MAD)",
  SAR: "ريال سعودي (SAR)",
};

export function currencyLabel(code: string): string {
  return CURRENCY_LABELS[code] ?? code;
}
