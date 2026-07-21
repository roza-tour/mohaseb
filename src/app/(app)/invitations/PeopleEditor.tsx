"use client";

import { useState } from "react";

type Person = { name: string; passport: string };
export type CustomerOpt = {
  id: string;
  name: string;
  passport: string;
  companions: Person[];
};

export function PeopleEditor({ customers }: { customers: CustomerOpt[] }) {
  const [people, setPeople] = useState<Person[]>([{ name: "", passport: "" }]);

  const loadCustomer = (id: string) => {
    const c = customers.find((x) => x.id === id);
    if (!c) return;
    const list: Person[] = [{ name: c.name, passport: c.passport || "" }, ...c.companions];
    setPeople(list.length ? list : [{ name: "", passport: "" }]);
  };

  const setP = (i: number, key: keyof Person, v: string) =>
    setPeople((prev) => prev.map((p, idx) => (idx === i ? { ...p, [key]: v } : p)));

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";

  return (
    <div className="space-y-2">
      {customers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-sky-50 border border-sky-100 px-3 py-2">
          <span className="text-xs text-slate-600">تحميل من عميل (المقدّم + مرافقيه):</span>
          <select
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) loadCustomer(e.target.value);
            }}
          >
            <option value="">— اختر عميلاً —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.companions.length ? ` (+${c.companions.length})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_36px] gap-2 text-xs font-medium text-slate-500 px-1">
        <span>الاسم</span>
        <span>رقم جواز السفر</span>
        <span></span>
      </div>

      {people.map((p, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_36px] gap-2 items-center">
          <input
            className={inputClass}
            placeholder={i === 0 ? "المقدّم الأساسي" : `مرافق ${i}`}
            value={p.name}
            onChange={(e) => setP(i, "name", e.target.value)}
          />
          <input
            className={inputClass}
            dir="ltr"
            placeholder="رقم جواز السفر"
            value={p.passport}
            onChange={(e) => setP(i, "passport", e.target.value)}
          />
          <button
            type="button"
            onClick={() => setPeople((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))}
            className="text-red-500 hover:text-red-700 text-lg leading-none"
            aria-label="حذف"
          >
            ✕
          </button>
        </div>
      ))}

      {people.map((p, i) => (
        <span key={`h-${i}`}>
          <input type="hidden" name="person_name" value={p.name} />
          <input type="hidden" name="person_passport" value={p.passport} />
        </span>
      ))}

      <button
        type="button"
        onClick={() => setPeople((prev) => [...prev, { name: "", passport: "" }])}
        className="text-sm text-sky-600 hover:underline"
      >
        + إضافة شخص
      </button>
    </div>
  );
}
