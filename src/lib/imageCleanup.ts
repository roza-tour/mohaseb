// تنظيف صور الشعار والختم عند رفعها: تفريغ الخلفية البيضاء (تصبح شفافة)
// مع تنعيم الحواف، وتكبير معتدل حتى لا تتبكسل داخل ملفات الـ PDF.
// pure-JS (jimp) بدون مكتبات نظام حتى تعمل على الاستضافة المشتركة.
import Jimp from "jimp";

export async function cleanupLogoStamp(input: Buffer): Promise<Buffer> {
  const img = await Jimp.read(input);
  const { width, data } = img.bitmap;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const min = Math.min(r, g, b);
    if (r > 232 && g > 232 && b > 232) {
      // أبيض صريح → شفاف تماماً
      data[i + 3] = 0;
    } else if (min > 200) {
      // شبه أبيض عند الحواف → شفافية جزئية لتنعيم الحدود
      data[i + 3] = Math.round(((255 - min) / 55) * 255);
    }
  }

  // تكبير معتدل للصور الصغيرة لرفع وضوحها في الطباعة
  if (width < 700) {
    img.resize(width * 2, Jimp.AUTO, Jimp.RESIZE_BICUBIC);
  }

  return img.getBufferAsync(Jimp.MIME_PNG);
}
