import Link from "next/link";

// رابطان لتحميل نفس المستند بالعربية أو بالفرنسية
export function PdfLangLinks({ base, label = "PDF" }: { base: string; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <span className="text-slate-400">{label}:</span>
      <Link href={`${base}?lang=ar`} target="_blank" className="text-sky-600 hover:underline">
        عربي
      </Link>
      <span className="text-slate-300">/</span>
      <Link href={`${base}?lang=fr`} target="_blank" className="text-sky-600 hover:underline">
        FR
      </Link>
    </span>
  );
}
