// قراءة جواز السفر داخل المتصفح: نقصّ شريط MRZ أسفل الصفحة، نكبّره ونحوّله أبيض/أسود
// (threshold) لرفع دقة OCR، ثم نمرّره لـ tesseract بقائمة أحرف MRZ فقط. كل ذلك محلياً
// دون رفع الصورة. يُستخدم في بطاقة العميل وفي محرر مسافري الفيزا.
import { parseMRZ, type MrzResult } from "./mrz";

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

// يقصّ الجزء السفلي (شريط MRZ) ويكبّره ويحوّله لأبيض وأسود واضح
function preprocess(img: HTMLImageElement, bottomFraction: number): HTMLCanvasElement {
  const cropTop = Math.floor(img.height * (1 - bottomFraction));
  const cropH = img.height - cropTop;
  const targetW = 1500;
  const scale = Math.max(targetW / img.width, 1);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(cropH * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, cropTop, img.width, cropH, 0, 0, canvas.width, canvas.height);

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = data.data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  const mean = sum / (d.length / 4);
  const threshold = mean * 0.82; // أقل قليلاً من المتوسط لعزل النص الداكن
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = g < threshold ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

const MRZ_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<";

export async function scanPassport(file: File): Promise<Partial<MrzResult> | null> {
  const img = await loadImage(file);
  const T = await import("tesseract.js");
  const worker = await T.createWorker("eng");
  try {
    await worker.setParameters({
      tessedit_char_whitelist: MRZ_CHARS,
      tessedit_pageseg_mode: T.PSM.SINGLE_BLOCK,
    });
    // نجرّب أحجام قصّ متدرجة: شريط أسفل الجواز، ثم أكبر، ثم الصورة كاملة
    for (const frac of [0.3, 0.45, 1]) {
      const canvas = preprocess(img, frac);
      const { data } = await worker.recognize(canvas);
      const parsed = parseMRZ(data.text);
      if (parsed) return parsed;
    }
    return null;
  } finally {
    await worker.terminate();
  }
}
