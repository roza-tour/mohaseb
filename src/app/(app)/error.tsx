"use client";

// شاشة الخطأ داخل التطبيق.
// بدل الرسالة الإنجليزية الافتراضية «A server error occurred» التي لا تقول شيئاً،
// نعرض رسالة عربية واضحة وزر إعادة محاولة، ورمز الخطأ لتسهيل تتبّعه في السجل.
import { useEffect } from "react";
import Link from "@/components/AppLink";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // يظهر في stderr.log على الاستضافة ليسهل تشخيصه لاحقاً
    console.error("خطأ في الصفحة:", error);
  }, [error]);

  return (
    <div className="max-w-xl mx-auto mt-10">
      <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-3xl">
          ⚠️
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">تعذّر عرض هذه الصفحة</h1>
        <p className="text-sm text-slate-600 mb-1">
          حدث خطأ أثناء قراءة البيانات. جرّب إعادة المحاولة — وإن تكرر الخطأ فغالباً توجد
          بيانات ناقصة أو مرتبطة بسجل محذوف.
        </p>
        <p className="text-xs text-slate-500 mb-6">
          لمعرفة السبب بدقة شغّل على السيرفر: <code dir="ltr">bash scripts/diagnose.sh</code>
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition"
          >
            إعادة المحاولة
          </button>
          <Link
            href="/"
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
          >
            العودة للوحة التحكم
          </Link>
        </div>

        {error.digest && (
          <p className="mt-6 text-xs text-slate-400" dir="ltr">
            رمز الخطأ: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
