// توليد رمز QR (PNG) لتضمينه في المستندات — يحمل رابط صفحة التحقق العامة.
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
