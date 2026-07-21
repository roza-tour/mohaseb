// تنظيف صور الشعار والختم عند رفعها: تفريغ الخلفية البيضاء فقط (المتصلة بحواف الصورة)
// حتى لا تختفي الأجزاء البيضاء داخل الشعار (كتابة بيضاء، دائرة بيضاء...). ثم تكبير معتدل
// للصور الصغيرة. pure-JS (jimp) بدون مكتبات نظام حتى تعمل على الاستضافة المشتركة.
import Jimp from "jimp";

const MAX_DIM = 1200; // سقف الأبعاد لتفادي استهلاك الذاكرة وتضخّم ملفات الـ PDF
const WHITE = 228; // عتبة اعتبار البكسل "أبيض/خلفية"

export async function cleanupLogoStamp(input: Buffer): Promise<Buffer> {
  const img = await Jimp.read(input);

  // تصغير الصور الضخمة أولاً
  if (Math.max(img.bitmap.width, img.bitmap.height) > MAX_DIM) {
    if (img.bitmap.width >= img.bitmap.height) img.resize(MAX_DIM, Jimp.AUTO);
    else img.resize(Jimp.AUTO, MAX_DIM);
  }

  const { width, height, data } = img.bitmap;
  const isBg = (i: number) => data[i] > WHITE && data[i + 1] > WHITE && data[i + 2] > WHITE;

  // تعبئة فيضية من الحواف: نُفرّغ فقط البكسلات البيضاء المتصلة بالإطار الخارجي
  const visited = new Uint8Array(width * height);
  const stack: number[] = [];
  const seed = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    stack.push(y * width + x);
  };
  for (let x = 0; x < width; x++) {
    seed(x, 0);
    seed(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    seed(0, y);
    seed(width - 1, y);
  }
  while (stack.length) {
    const p = stack.pop()!;
    if (visited[p]) continue;
    visited[p] = 1;
    const i = p * 4;
    if (!isBg(i)) continue;
    data[i + 3] = 0; // شفاف
    const x = p % width;
    const y = (p - x) / width;
    seed(x + 1, y);
    seed(x - 1, y);
    seed(x, y + 1);
    seed(x, y - 1);
  }

  // تكبير معتدل للصور الصغيرة لرفع وضوحها في الطباعة
  if (img.bitmap.width < 700) {
    img.resize(img.bitmap.width * 2, Jimp.AUTO, Jimp.RESIZE_BICUBIC);
  }

  return img.getBufferAsync(Jimp.MIME_PNG);
}
