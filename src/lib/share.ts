// أدوات الروابط العامة للمستندات (مشاركة/تحقق عبر QR)
import crypto from "crypto";

export function genToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

// عنوان التطبيق العام (للروابط المطلقة داخل QR والبريد)
export function appUrl(): string {
  return (process.env.APP_URL || "https://mohaseb.rozatour-booking.com").replace(/\/$/, "");
}

// رابط التحقق العام من مستند (يُشفَّر داخل QR ويُفتح بلا تسجيل دخول)
export function verifyUrl(kind: "invoice" | "invitation", token: string): string {
  return `${appUrl()}/verify/${kind}/${token}`;
}
