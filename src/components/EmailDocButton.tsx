"use client";

import { useState } from "react";
import { FormButton } from "@/components/FormButton";

// زر إرسال مستند بالبريد. إن كان للعميل بريد محفوظ يُرسَل مباشرةً،
// وإلا يظهر حقل صغير لإدخال البريد قبل الإرسال.
export function EmailDocButton({
  action,
  defaultEmail,
  requireInput = false,
}: {
  action: (formData: FormData) => void;
  defaultEmail?: string | null;
  requireInput?: boolean;
}) {
  const [open, setOpen] = useState(false);

  // إرسال مباشر: يوجد بريد محفوظ ولا نطلب إدخالاً
  if (!requireInput && defaultEmail) {
    return (
      <form action={action}>
        <input type="hidden" name="lang" value="ar" />
        <FormButton title={`إرسال إلى ${defaultEmail}`} className="text-sky-600 text-sm hover:underline whitespace-nowrap">
          ✉️ بالبريد
        </FormButton>
      </form>
    );
  }

  // يحتاج إدخال بريد
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sky-600 text-sm hover:underline whitespace-nowrap"
      >
        ✉️ بالبريد
      </button>
    );
  }

  return (
    <form action={action} className="flex items-center gap-1">
      <input type="hidden" name="lang" value="ar" />
      <input
        type="email"
        name="email"
        required
        defaultValue={defaultEmail ?? ""}
        placeholder="البريد الإلكتروني"
        className="rounded border border-slate-300 px-2 py-1 text-xs w-40"
      />
      <FormButton className="text-emerald-600 text-sm hover:underline whitespace-nowrap">
        إرسال
      </FormButton>
    </form>
  );
}
