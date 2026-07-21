"use client";

// زر مشترك: يصوّر الجواز، يقرأ شريط MRZ داخل المتصفح (tesseract.js) بدون رفع الصورة،
// ثم يمرّر البيانات المقروءة للأب عبر onScan.
import { useRef, useState } from "react";
import { parseMRZ, type MrzResult } from "@/lib/mrz";

export function PassportScanButton({
  onScan,
  onMessage,
  className = "",
  label = "📷 مسح الجواز (تعبئة تلقائية)",
}: {
  onScan: (data: Partial<MrzResult>) => void;
  onMessage?: (msg: string) => void;
  className?: string;
  label?: string;
}) {
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const run = async (file: File) => {
    setScanning(true);
    onMessage?.("جارٍ قراءة الجواز... (قد تستغرق 10-20 ثانية أول مرة)");
    try {
      const Tesseract = (await import("tesseract.js")).default;
      const { data } = await Tesseract.recognize(file, "eng", {});
      const parsed = parseMRZ(data.text);
      if (parsed) {
        onScan(parsed);
        onMessage?.("✅ تمت قراءة الجواز — راجعي البيانات وأكملي الناقص");
      } else {
        onMessage?.("⚠️ لم أتمكن من قراءة شريط MRZ — تأكدي أن السطرين أسفل الجواز واضحين، أو أدخلي البيانات يدوياً");
      }
    } catch {
      onMessage?.("⚠️ تعذرت القراءة التلقائية — أدخلي البيانات يدوياً");
    } finally {
      setScanning(false);
    }
  };

  return (
    <>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        ref={fileRef}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) run(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={scanning}
        className={
          className ||
          "text-xs rounded-lg bg-sky-600 text-white px-3 py-1.5 hover:bg-sky-700 disabled:opacity-50"
        }
      >
        {scanning ? "⏳ جارٍ القراءة..." : label}
      </button>
    </>
  );
}
