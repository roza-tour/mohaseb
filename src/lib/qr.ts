// توليد رمز QR (PNG) لتضمينه في المستندات. يشفّر ملخصاً نصياً للمستند.
import QRCode from "qrcode";

export async function makeQrPng(text: string): Promise<Buffer | null> {
  if (!text.trim()) return null;
  try {
    return await QRCode.toBuffer(text, {
      type: "png",
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
      color: { dark: "#0f172aff", light: "#ffffffff" },
    });
  } catch {
    return null;
  }
}

// نص موحّد داخل الـ QR: الوكالة + نوع المستند ورقمه + التاريخ + الموقع
export function docQrText(p: {
  agency?: string | null;
  type: string;
  number: string;
  date: string;
  website?: string | null;
}): string {
  return [p.agency?.trim() || "ROZATOUR", `${p.type} N° ${p.number}`, p.date, p.website?.trim()]
    .filter(Boolean)
    .join("\n");
}
