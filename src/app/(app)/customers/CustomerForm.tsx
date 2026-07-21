"use client";

import { useState } from "react";
import { Field, Input, Textarea, Button, LinkButton } from "@/components/ui";
import { PassportScanButton } from "@/components/PassportScanButton";
import type { MrzResult } from "@/lib/mrz";

type Initial = { name?: string; phone?: string; email?: string; notes?: string };

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
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [msg, setMsg] = useState("");

  const onScan = (d: Partial<MrzResult>) => {
    const full = `${d.prenom ?? ""} ${d.nom ?? ""}`.trim();
    if (full) setName(full);
    // نضيف رقم الجواز والجنسية للملاحظات إن كانت فارغة (بيانات مفيدة دون حفظ صورة الجواز)
    const extra = [d.numero ? `جواز: ${d.numero}` : "", d.nationalite ? `الجنسية: ${d.nationalite}` : ""]
      .filter(Boolean)
      .join(" — ");
    if (extra && !notes.trim()) setNotes(extra);
  };

  return (
    <form action={action} className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2 rounded-lg bg-sky-50 border border-sky-100 px-3 py-2">
        <p className="text-xs text-slate-600">صوّري جواز العميل لتعبئة الاسم تلقائياً — القراءة داخل متصفحك ولا تُرفع الصورة</p>
        <PassportScanButton onScan={onScan} onMessage={setMsg} />
      </div>
      {msg && <p className="text-xs text-slate-600">{msg}</p>}

      <Field label="الاسم">
        <Input name="name" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="رقم الهاتف">
        <Input name="phone" defaultValue={initial.phone ?? ""} />
      </Field>
      <Field label="البريد الإلكتروني">
        <Input name="email" type="email" defaultValue={initial.email ?? ""} />
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
