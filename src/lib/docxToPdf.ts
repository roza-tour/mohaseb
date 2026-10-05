// تحويل ملف Word إلى PDF بنسخة LibreOffice المثبَّتة على الخادم.
//
// لماذا هكذا ولا نبني الـ PDF بأنفسنا: ملف برنامج الفيزا نموذج رسمي لمديرية
// السياحة يُقدَّم للإدارة. إعادة رسم شكله برمجياً تنتج مستنداً يشبهه ولا هو
// هو، وذلك خطر قانوني. فالمصدر يبقى ملف الوزارة نفسه، ولا نفعل به شيئاً
// سوى طباعته PDF — تماماً كما لو فتحته في Word واخترت «حفظ بصيغة PDF».
//
// LibreOffice غير مثبّت على كل استضافات cPanel. لذلك كل شيء هنا اختياري:
// إن لم يوجد نقول ذلك صراحةً ولا نُخرج بديلاً مصنوعاً.
import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";

const CANDIDATES = [
  "/usr/bin/soffice",
  "/usr/local/bin/soffice",
  "/opt/libreoffice/program/soffice",
  "/usr/lib/libreoffice/program/soffice",
  "/usr/bin/libreoffice",
];

let cached: { path: string | null } | null = null;

// مسار soffice إن وُجد — يُفحص مرة واحدة لكل تشغيل
export function sofficePath(): string | null {
  if (cached) return cached.path;
  let found: string | null = null;
  for (const c of CANDIDATES) {
    try {
      fs.accessSync(c, fs.constants.X_OK);
      found = c;
      break;
    } catch {
      /* نجرّب التالي */
    }
  }
  if (!found) {
    // آخر محاولة: البحث في PATH
    for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
      for (const name of ["soffice", "libreoffice"]) {
        const p = path.join(dir, name);
        try {
          fs.accessSync(p, fs.constants.X_OK);
          found = p;
          break;
        } catch {
          /* نجرّب التالي */
        }
      }
      if (found) break;
    }
  }
  cached = { path: found };
  return found;
}

export function canConvertToPdf(): boolean {
  return sofficePath() !== null;
}

// يحوّل Word إلى PDF، ويعيد null إن تعذّر — بلا بديل مصنوع
export async function docxToPdf(docx: Buffer): Promise<Buffer | null> {
  const soffice = sofficePath();
  if (!soffice) return null;

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mohaseb-pdf-"));
  const input = path.join(dir, "doc.docx");
  const output = path.join(dir, "doc.pdf");
  try {
    fs.writeFileSync(input, docx);
    // ملف تعريف مستقل داخل المجلد المؤقت: لا يتعارض مع نسخة LibreOffice
    // مفتوحة ولا يحتاج صلاحية الكتابة في مجلد المستخدم
    const profile = path.join(dir, "profile");
    await new Promise<void>((resolve, reject) => {
      execFile(
        soffice,
        [
          "--headless",
          "--norestore",
          "--nolockcheck",
          `-env:UserInstallation=file://${profile}`,
          "--convert-to",
          "pdf",
          "--outdir",
          dir,
          input,
        ],
        { timeout: 120000, env: { ...process.env, HOME: dir } },
        (err) => (err ? reject(err) : resolve())
      );
    });
    if (!fs.existsSync(output)) return null;
    const pdf = fs.readFileSync(output);
    return pdf.length > 0 ? pdf : null;
  } catch {
    return null;
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* نتجاهل */
    }
  }
}
