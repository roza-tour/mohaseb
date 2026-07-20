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
