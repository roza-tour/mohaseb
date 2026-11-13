"use client";

// عميل الفاتورة: إما اختيار عميل مسجَّل، أو كتابة الاسم (وبيانات اختيارية) يدوياً.
import { useState } from "react";
import { Field, Select, Input, Textarea } from "@/components/ui";

type Mode = "registered" | "manual";

export function CustomerPicker({
  customers,
  initialId,
  initialName,
  initialDetails,
}: {
  customers: { id: string; name: string }[];
  initialId: string;
  initialName: string;
  initialDetails: string;
}) {
  const [mode, setMode] = useState<Mode>(
    initialName || (!initialId && customers.length === 0) ? "manual" : "registered",
  );

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`flex-1 rounded-lg px-3 py-1.5 text-xs border transition ${
        mode === m
          ? "bg-sky-600 text-white border-sky-600"
          : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="sm:col-span-2 space-y-2">
      <span className="block text-sm font-medium text-slate-700">العميل (اختياري)</span>
      <div className="flex gap-2 max-w-md">
        {tab("registered", "عميل مسجَّل")}
        {tab("manual", "كتابة يدوية")}
      </div>
      {mode === "registered" ? (
        <Select name="customerId" defaultValue={initialId}>
          <option value="">بدون عميل</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input type="hidden" name="customerId" value="" />
          <Field label="اسم العميل">
            <Input name="customerName" defaultValue={initialName} placeholder="مثال: Jean DUPONT / شركة ..." />
          </Field>
          <Field label="بيانات العميل (اختياري — عنوان، هاتف...)">
            <Textarea name="customerDetails" rows={2} defaultValue={initialDetails} />
          </Field>
        </div>
      )}
    </div>
  );
}
