"use client";

import { useState } from "react";
import { Field, Input, Textarea, Button, LinkButton } from "@/components/ui";
import { PassportScanButton } from "@/components/PassportScanButton";
import type { MrzResult } from "@/lib/mrz";

type Companion = { name: string; passport: string };
type Initial = {
  name?: string;
  phone?: string;
  email?: string;
  passport?: string;
  companions?: Companion[];
  notes?: string;
};

export function CustomerForm({
  action,
  initial = {},
  submitLabel = "حفظ",
}: {
  action: (formData: FormData) => void | Promise<void>;
  initial?: Initial;
  submitLabel?: string;
}) {
  const [name, setName] = useState(initial.name ?? "");
  const [passport, setPassport] = useState(initial.passport ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [companions, setCompanions] = useState<Companion[]>(initial.companions ?? []);
  const [msg, setMsg] = useState("");

  const onScan = (d: Partial<MrzResult>) => {
    const full = `${d.prenom ?? ""} ${d.nom ?? ""}`.trim();
    if (full) setName(full);
    if (d.numero) setPassport(d.numero);
  };

  const setComp = (i: number, key: keyof Companion, v: string) =>
    setCompanions((prev) => prev.map((c, idx) => (idx === i ? { ...c, [key]: v } : c)));

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";

  return (
    <form action={action} className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2 rounded-lg bg-sky-50 border border-sky-100 px-3 py-2">
        <p className="text-xs text-slate-600">صوّري جواز العميل لتعبئة الاسم ورقم الجواز تلقائياً — القراءة داخل متصفحك ولا تُرفع الصورة</p>
        <PassportScanButton onScan={onScan} onMessage={setMsg} />
      </div>
      {msg && <p className="text-xs text-slate-600">{msg}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="الاسم">
          <Input name="name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="رقم جواز السفر (اختياري — للدعوات)">
          <Input name="passport" value={passport} onChange={(e) => setPassport(e.target.value)} dir="ltr" />
        </Field>
        <Field label="رقم الهاتف">
          <Input name="phone" defaultValue={initial.phone ?? ""} />
        </Field>
        <Field label="البريد الإلكتروني">
          <Input name="email" type="email" defaultValue={initial.email ?? ""} />
        </Field>
      </div>

      <Field label="المرافقون (عائلة/أطفال — اختياري)">
        <div className="space-y-2">
          <p className="text-xs text-slate-500">
            أضيفي أفراد العائلة هنا بدل تسجيلهم كعملاء مستقلين — يظهروا تلقائياً في الدعوة.
          </p>
          {companions.map((c, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_36px] gap-2 items-center">
              <input
                className={inputClass}
                placeholder={`اسم المرافق ${i + 1}`}
                value={c.name}
                onChange={(e) => setComp(i, "name", e.target.value)}
              />
              <input
                className={inputClass}
                dir="ltr"
                placeholder="رقم جواز السفر (اختياري)"
                value={c.passport}
                onChange={(e) => setComp(i, "passport", e.target.value)}
              />
              <button
                type="button"
                onClick={() => setCompanions((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-red-500 hover:text-red-700 text-lg leading-none"
                aria-label="حذف المرافق"
              >
                ✕
              </button>
            </div>
          ))}
          {/* الحقول تُرسل كمصفوفتين متوازيتين */}
          {companions.map((c, i) => (
            <span key={`h-${i}`}>
              <input type="hidden" name="comp_name" value={c.name} />
              <input type="hidden" name="comp_passport" value={c.passport} />
            </span>
          ))}
          <button
            type="button"
            onClick={() => setCompanions((prev) => [...prev, { name: "", passport: "" }])}
            className="text-sm text-sky-600 hover:underline"
          >
            + إضافة مرافق
          </button>
        </div>
      </Field>

      <Field label="ملاحظات">
        <Textarea name="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit">{submitLabel}</Button>
        <LinkButton href="/customers" variant="secondary">
          إلغاء
        </LinkButton>
      </div>
    </form>
  );
}
