import Link from "next/link";

type LangOpt = { code: "ar" | "fr" | "en"; label: string };
const ALL: LangOpt[] = [
  { code: "ar", label: "عربي" },
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" },
];

// روابط لتحميل نفس المستند بلغات مختلفة (الافتراضي عربي/فرنسي، والفواتير تضيف الإنجليزية)
export function PdfLangLinks({
  base,
  label = "PDF",
  langs = ["ar", "fr"],
}: {
  base: string;
  label?: string;
  langs?: Array<"ar" | "fr" | "en">;
}) {
  const opts = ALL.filter((o) => langs.includes(o.code));
  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <span className="text-slate-400">{label}:</span>
      {opts.map((o, i) => (
        <span key={o.code} className="inline-flex items-center gap-2">
          {i > 0 && <span className="text-slate-300">/</span>}
          <Link href={`${base}?lang=${o.code}`} target="_blank" className="text-sky-600 hover:underline">
            {o.label}
          </Link>
        </span>
      ))}
    </span>
  );
}
