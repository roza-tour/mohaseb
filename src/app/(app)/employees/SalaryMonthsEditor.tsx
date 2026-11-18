"use client";

// أشهر بيان الراتب: شهر البداية + المدة (شهر، 3، 6...) ثم سطر لكل شهر:
// الأعمال التي جلبها الموظف (إن كان يأخذ نسبة)، المنح، الاقتطاعات — كلها اختيارية.
import { useState } from "react";
import { Field, Input, Select } from "@/components/ui";
import { CURRENCIES } from "@/lib/currencies";

const AR_MONTHS = [
  "جانفي",
  "فيفري",
  "مارس",
  "أفريل",
  "ماي",
  "جوان",
  "جويلية",
  "أوت",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

// الأشهر المتتالية ابتداءً من شهر البداية (YYYY-MM)
function monthsFrom(start: string, n: number): string[] {
  const m = start.match(/^(\d{4})-(\d{2})$/);
  if (!m) return [];
  let y = Number(m[1]);
  let mo = Number(m[2]);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.push(`${y}-${String(mo).padStart(2, "0")}`);
    mo += 1;
    if (mo > 12) {
      mo = 1;
      y += 1;
    }
  }
  return out;
}

const label = (p: string) => {
  const [y, m] = p.split("-");
  return `${AR_MONTHS[Number(m) - 1]} ${y}`;
};

const cell =
  "w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";

type Row = { base: string; bonus: string; ded: string };

export function SalaryMonthsEditor({
  showCommission,
  defaultCurrency,
  thisMonth,
}: {
  showCommission: boolean;
  defaultCurrency: string;
  thisMonth: string;
}) {
  const [start, setStart] = useState(thisMonth);
  const [count, setCount] = useState(1);
  // القيم محفوظة حسب الشهر، فتغيير المدة لا يمسح ما كُتب
  const [values, setValues] = useState<Record<string, Row>>({});
  const months = monthsFrom(start, count);
  const set = (p: string, k: keyof Row, v: string) =>
    setValues((prev) => {
      const row: Row = prev[p] ?? { base: "", bonus: "", ded: "" };
      return { ...prev, [p]: { ...row, [k]: v } };
    });

  return (
    <div className="sm:col-span-2 space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <Field label="من شهر">
          <Input type="month" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="مدة البيان">
          <Select value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "شهر واحد" : n === 2 ? "شهران" : n <= 10 ? `${n} أشهر` : `${n} شهراً`}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {showCommission && (
        <Field label="عملة الأعمال التي يجلبها الموظف (تُحسب عليها النسبة)">
          <div className="w-32">
            <Select name="commissionCurrency" defaultValue={defaultCurrency}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c === "DZD" ? "دينار" : c === "EUR" ? "يورو" : c}
                </option>
              ))}
            </Select>
          </div>
        </Field>
      )}

      <div className="rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-2 py-1.5 text-right font-medium">الشهر</th>
              {showCommission && <th className="px-2 py-1.5 text-right font-medium">الأعمال اللي جابها</th>}
              <th className="px-2 py-1.5 text-right font-medium">منح</th>
              <th className="px-2 py-1.5 text-right font-medium">اقتطاعات</th>
            </tr>
          </thead>
          <tbody>
            {months.map((p) => {
              const v = values[p] ?? { base: "", bonus: "", ded: "" };
              return (
                <tr key={p} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 whitespace-nowrap text-xs text-slate-700">
                    {label(p)}
                    <input type="hidden" name="months_period" value={p} />
                  </td>
                  {showCommission && (
                    <td className="px-1.5 py-1.5 min-w-20">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        name="months_base"
                        value={v.base}
                        onChange={(e) => set(p, "base", e.target.value)}
                        className={cell}
                      />
                    </td>
                  )}
                  <td className="px-1.5 py-1.5 min-w-20">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      name="months_bonus"
                      value={v.bonus}
                      onChange={(e) => set(p, "bonus", e.target.value)}
                      className={cell}
                    />
                  </td>
                  <td className="px-1.5 py-1.5 min-w-20">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      name="months_deductions"
                      value={v.ded}
                      onChange={(e) => set(p, "ded", e.target.value)}
                      className={cell}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
