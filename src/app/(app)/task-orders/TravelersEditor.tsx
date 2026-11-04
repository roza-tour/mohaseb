"use client";

// المسافرون في أمر التكليف: العدد وأسماؤهم — كله اختياري.
// كتابة العدد تُظهر خانات أسماء بعدده، ويمكن إضافة اسم أو حذفه بحرية.
import { useState } from "react";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";

export function TravelersEditor({ initialCount, initialNames }: { initialCount: string; initialNames: string[] }) {
  const [count, setCount] = useState(initialCount);
  const [names, setNames] = useState<string[]>(initialNames);

  const onCount = (v: string) => {
    setCount(v);
    const n = Math.min(parseInt(v, 10) || 0, 100);
    // نزيد الخانات حتى العدد المكتوب، ولا نحذف اسماً كُتب
    setNames((prev) => (n > prev.length ? [...prev, ...Array(n - prev.length).fill("")] : prev));
  };

  return (
    <fieldset className="rounded-lg border border-slate-200 p-4 space-y-3">
      <legend className="px-1 text-sm font-medium text-slate-700">
        المسافرون <span className="text-xs font-normal text-slate-400">(اختياري — الفارغ لا يظهر في الأمر)</span>
      </legend>

      <label className="block max-w-xs">
        <span className="block text-sm text-slate-700 mb-1">عدد المسافرين</span>
        <input
          name="f_tripPax"
          inputMode="numeric"
          value={count}
          onChange={(e) => onCount(e.target.value)}
          placeholder="مثال: 4"
          className={inputClass}
        />
      </label>

      {names.length > 0 && <span className="block text-sm text-slate-700">أسماء المسافرين</span>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {names.map((n, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-6 text-xs text-slate-400 text-center">{i + 1}</span>
            <input
              name="travelerName"
              value={n}
              onChange={(e) => setNames((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
              placeholder="اسم المسافر"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setNames((prev) => prev.filter((_, j) => j !== i))}
              className="text-red-500 hover:text-red-700 text-lg px-1"
              aria-label="حذف المسافر"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setNames((prev) => [...prev, ""])}
        className="text-sm text-sky-600 hover:underline"
      >
        + إضافة اسم مسافر
      </button>
    </fieldset>
  );
}
