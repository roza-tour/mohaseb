// اسم عميل الفاتورة: المكتوب يدوياً أولاً، ثم العميل المسجَّل المرتبط
export function invoiceCustomerName(inv: {
  customerName?: string | null;
  customer?: { name?: string | null } | null;
}): string {
  return inv.customerName?.trim() || inv.customer?.name?.trim() || "";
}
