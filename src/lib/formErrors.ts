import type { ZodError } from "zod";

// يستخرج أول رسالة خطأ صالحة للعرض للمستخدم من أخطاء zod.
// رسائلنا المخصصة عربية؛ أما رسائل zod الافتراضية (إنجليزية تقنية)
// فتُستبدل برسالة عربية عامة.
const ARABIC_RE = /[؀-ۿ]/;

export function firstErrorMessage(error: ZodError): string {
  const msg = error.issues[0]?.message ?? "";
  if (ARABIC_RE.test(msg)) return msg;
  return "بيانات غير صالحة — تأكد من تعبئة كل الحقول المطلوبة بشكل صحيح";
}

export function withError(path: string, message: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}error=${encodeURIComponent(message)}`;
}
