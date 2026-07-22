// رابط تنزيل ملف (route handler) — نستخدم <a> عمداً بدل Link حتى يبدأ التنزيل مباشرةً.
export function ExportButton({ href, label = "⤓ تصدير Excel" }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
    >
      {label}
    </a>
  );
}
