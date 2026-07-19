// رابط واتساب مباشر برسالة جاهزة — يعمل مع أي رقم مكتوب بأي تنسيق
export function waLink(phone: string | null | undefined, message: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
