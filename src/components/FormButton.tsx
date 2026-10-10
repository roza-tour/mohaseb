"use client";

// أزرار النماذج بحالة «جارٍ التنفيذ».
//
// أزرار الحفظ والإضافة والحذف تنفّذ إجراءً على السيرفر ثم تنتظر رده، ولم يكن
// يظهر عليها شيء أثناء الانتظار — فيبدو أن الضغطة لم تُسمع ويضغط المستخدم
// مرة ثانية وثالثة (وقد يُنشئ ذلك فاتورة أو سنداً مكرراً). هنا يُقفل الزر
// فور الضغط ويظهر عليه مؤشر دوّار حتى يرد السيرفر، عبر useFormStatus الذي
// يقرأ حالة النموذج الذي يحتوي الزر. خارج أي نموذج يبقى زراً عادياً.
import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes } from "react";

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
    />
  );
}

const VARIANTS = {
  primary: "bg-sky-600 text-white hover:bg-sky-700",
  secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

// الزر الأساسي في الواجهة (Button في ui.tsx)
export function Button({
  children,
  variant = "primary",
  type = "submit",
  className = "",
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANTS }) {
  const { pending } = useFormStatus();
  const busy = pending && type === "submit";
  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${busy ? "cursor-wait" : ""} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {busy ? <Spinner /> : null}
      {children}
    </button>
  );
}

// زر إرسال بلا تنسيق ثابت — بديل <button type="submit"> في الروابط النصية
// الصغيرة داخل الجداول (نسخة، حذف، تغيير الحالة، إرسال بالبريد)
export function FormButton({
  children,
  className = "",
  disabled,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`${className} ${pending ? "opacity-60 cursor-wait" : ""}`}
      {...rest}
    >
      {pending ? (
        <span className="inline-flex items-center gap-1">
          <Spinner />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
