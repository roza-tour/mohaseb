"use client";

// شريط تقدّم رفيع أعلى الصفحة يظهر لحظة الضغط على أي رابط داخلي، ويختفي
// حين تصل الصفحة الجديدة. بلا تحميل مسبق للروابط تنتظر الضغطة رد السيرفر،
// وكان المستخدم يرى لا شيء حتى يصل الرد فيظن أن الضغطة لم تُسمع.
// يعمل على كل الروابط بلا تعديلها: يستمع للنقرات على مستوى المستند.
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// روابط تنزيل ملفات لا تغيّر الصفحة — لا نُظهر لها الشريط وإلا بقي عالقاً
const FILE_ROUTE = /^\/api\/|\/(pdf|word|excel|export)(\/|$)/;

export default function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const key = `${pathname}?${search.toString()}`;

  // عنوان الصفحة التي ضُغط منها الرابط. الحالة تُشتق منه:
  // ما زلنا عليها = جارٍ التحميل، تغيّرت = وصلت الصفحة الجديدة
  const [from, setFrom] = useState<string | null>(null);
  const state = from === null ? "idle" : from === key ? "loading" : "done";

  const keyRef = useRef(key);
  useEffect(() => {
    keyRef.current = key;
  }, [key]);

  // بعد اكتمال الشريط نخفيه
  useEffect(() => {
    if (state !== "done") return;
    const t = setTimeout(() => setFrom(null), 350);
    return () => clearTimeout(t);
  }, [state]);

  useEffect(() => {
    let safety: ReturnType<typeof setTimeout> | null = null;
    const onClick = (e: MouseEvent) => {
      // مرحلة الالتقاط: Link يلغي السلوك الافتراضي في مرحلة الفقاعة، فنقرأ النقرة قبله
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href) return;
      if ((a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (FILE_ROUTE.test(url.pathname)) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      setFrom(keyRef.current);
      // حدّ أمان: لا يبقى الشريط ظاهراً إن لم تتغيّر الصفحة لأي سبب
      if (safety) clearTimeout(safety);
      safety = setTimeout(() => setFrom(null), 15000);
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      if (safety) clearTimeout(safety);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="no-print fixed top-0 right-0 left-0 z-50 h-[3px] pointer-events-none"
      style={{ opacity: state === "idle" ? 0 : 1, transition: "opacity 250ms" }}
    >
      <div
        className="h-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.7)]"
        style={{
          width: state === "idle" ? "0%" : state === "loading" ? "85%" : "100%",
          // يتقدّم بسرعة أولاً ثم يتباطأ — إحساس بالحركة حتى يصل الرد
          transition: state === "loading" ? "width 8s cubic-bezier(0.1, 0.8, 0.2, 1)" : "width 200ms ease-out",
        }}
      />
    </div>
  );
}
