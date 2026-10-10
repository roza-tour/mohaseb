// هيكل مؤقت يظهر مكان الصفحة بينما تُقرأ بياناتها، فتبقى القائمة الجانبية
// والترويسة كما هي ويرى المستخدم فوراً أن الصفحة الجديدة في الطريق.
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="جارٍ التحميل">
      <div className="mb-6">
        <div className="h-7 w-48 rounded bg-slate-200 mb-2" />
        <div className="h-4 w-72 rounded bg-slate-100" />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-4 flex-1 rounded bg-slate-100" />
            <div className="h-4 w-24 rounded bg-slate-100" />
            <div className="h-4 w-20 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
