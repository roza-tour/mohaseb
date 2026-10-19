"use client";

// بنود إضافية حرة في أمر التكليف: اسم البند وقيمته، تظهر في الأمر جدولاً.
// لكل ما لا تغطيه الخانات الجاهزة (رقم التأمين، رقم الهاتف الاحتياطي، ...).
import { useState } from "react";
import type { ExtraRow } from "@/lib/taskOrderFields";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";

export function ExtraRowsEditor({ initial }: { initial: ExtraRow[] }) {
  const [rows, setRows] = useState<ExtraRow[]>(initial);

  const update = (i: number, key: keyof ExtraRow, value: string) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));

  return (
    <fieldset className="rounded-lg border border-slate-200 p-4 space-y-2">
      <legend className="px-1 text-sm font-medium text-slate-700">
        بنود إضافية <span className="text-xs font-normal text-slate-400">(اختياري — أي بيان آخر تريد إظهاره في الأمر)</span>
      </legend>

      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_1.5fr_36px] gap-2">
          <input
            name="extraLabel"
            value={r.label}
            onChange={(e) => update(i, "label", e.target.value)}
            placeholder="اسم البند — مثال: رقم وثيقة التأمين"
            className={inputClass}
          />
          <input
            name="extraValue"
            value={r.value}
            onChange={(e) => update(i, "value", e.target.value)}
            placeholder="القيمة"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
            className="text-red-500 hover:text-red-700 text-lg"
            aria-label="حذف البند"
          >
            ×
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setRows((prev) => [...prev, { label: "", value: "" }])}
        className="text-sm text-sky-600 hover:underline"
      >
        + إضافة بند
      </button>
    </fieldset>
  );
}
