// حفظ صور الشعار والختم في public/uploads.
// كانت داخل إجراءات الإعدادات وحدها، ونقلناها هنا ليستعملها أيضاً شعار كل فرع.
import fs from "fs";
import path from "path";
import { cleanupLogoStamp } from "@/lib/imageCleanup";

const LOGO_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const LOGO_MAX = 5 * 1024 * 1024; // 5MB

export async function saveUpload(file: File, prefix: string): Promise<string | undefined> {
  if (!file || file.size === 0) return undefined;
  if (!LOGO_TYPES.includes(file.type)) {
    throw new Error("يُسمح فقط بصور PNG أو JPG أو WEBP");
  }
  if (file.size > LOGO_MAX) {
    throw new Error("حجم الصورة يتجاوز 5 ميغابايت");
  }
  const raw = Buffer.from(await file.arrayBuffer());

  // الشعار والختم: نفرّغ الخلفية البيضاء تلقائياً (تصبح شفافة) ونحفظها PNG
  let out: Uint8Array = raw;
  let ext = file.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
  try {
    out = await cleanupLogoStamp(raw);
    ext = "png";
  } catch {
    // لو فشلت المعالجة لأي سبب نحفظ الصورة الأصلية كما هي
    out = raw;
  }

  const filename = `${prefix}-${Date.now()}.${ext}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.promises.mkdir(uploadsDir, { recursive: true });
  await fs.promises.writeFile(path.join(uploadsDir, filename), out);
  return `/uploads/${filename}`;
}
