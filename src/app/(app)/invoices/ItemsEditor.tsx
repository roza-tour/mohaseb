"use client";

// محرر بنود الفاتورة: أسطر ديناميكية (بيان، كمية، سعر وحدة) مع إجمالي مباشر
import { useState, useEffect } from "react";

type Row = { description: string; qty: string; unitPrice: string };

const emptyRow: Row = { description: "", qty: "1", unitPrice: "" };

export function ItemsEditor({ currency }: { currency: string }) {
  const [rows, setRows] = useState<Row[]>([{ ...emptyRow }]);

  // العملة الظاهرة في الإجمالي تتبع قائمة اختيار العملة في النموذج مباشرةً
  // (القيمة الابتدائية تطابق أصلاً العملة الافتراضية، فنكتفي بالاشتراك في التغيير)
  const [cur, setCur] = useState(currency);
  useEffect(() => {
    const el = document.querySelector('select[name="currency"]') as HTMLSelectElement | null;
    if (!el) return;
    const onChange = () => setCur(el.value || currency);
    el.addEventListener("change", onChange);
    return () => el.removeEventListener("change", onChange);
  }, [currency]);

  const update = (i: number, key: keyof Row, value: string) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  };

  const total = rows.reduce((s, r) => {
    const q = Number(r.qty);
    const p = Number(r.unitPrice);
    return s + (Number.isFinite(q) && Number.isFinite(p) ? q * p : 0);
  }, 0);

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";

  return (
    <div className="space-y-2">
      <div className="hidden sm:grid sm:grid-cols-[1fr_90px_130px_40px] gap-2 text-xs font-medium text-slate-500 px-1">
        <span>البيان</span>
        <span>الكمية</span>
        <span>سعر الوحدة</span>
        <span></span>
      </div>

      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_90px_130px_40px] gap-2 items-center">
          <input
            name="itemDesc"
            value={row.description}
            onChange={(e) => update(i, "description", e.target.value)}
            placeholder={`البند ${i + 1} — مثال: برنامج سياحي 5 أيام لشخصين`}
            className={inputClass}
          />
          <input
            name="itemQty"
            type="number"
            min={1}
            step={1}
            value={row.qty}
            onChange={(e) => update(i, "qty", e.target.value)}
            className={inputClass}
          />
          <input
            name="itemPrice"
            type="number"
            min={0}
            step="0.01"
            value={row.unitPrice}
            onChange={(e) => update(i, "unitPrice", e.target.value)}
            placeholder="0.00"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setRows((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))}
            className="text-red-500 hover:text-red-700 text-lg leading-none"
            aria-label="حذف البند"
          >
            ✕
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, { ...emptyRow }])}
          className="text-sm text-sky-600 hover:underline"
        >
          + إضافة بند
        </button>
        <p className="text-sm text-slate-600">
          مجموع البنود:{" "}
          <span className="font-bold text-slate-800">
            {total.toLocaleString("en-US", { minimumFractionDigits: 2 })} {cur}
          </span>
        </p>
      </div>
    </div>
  );
}
