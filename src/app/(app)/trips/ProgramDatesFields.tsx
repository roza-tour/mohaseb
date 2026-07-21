"use client";

// حقول البرنامج والتواريخ مع ملء تلقائي: عند اختيار البرنامج وتاريخ البداية
// يُحسب تاريخ النهاية تلقائياً من مدة البرنامج (يبقى قابلاً للتعديل يدوياً)
import { useState } from "react";
import { Field, Input, Select } from "@/components/ui";

type ProgramOption = { id: string; name: string; durationDays: number };

function addDays(dateStr: string, days: number): string {
  // نحسب بتوقيت UTC حتى لا يتأثر الناتج بالمنطقة الزمنية للمتصفح (ينزاح اليوم لولاها)
  const d = new Date(dateStr + "T00:00:00Z");
  if (isNaN(d.getTime())) return "";
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function ProgramDatesFields({
  programs,
  initialProgramId = "",
  initialStart = "",
  initialEnd = "",
}: {
  programs: ProgramOption[];
  initialProgramId?: string;
  initialStart?: string;
  initialEnd?: string;
}) {
  const [programId, setProgramId] = useState(initialProgramId);
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  // هل عدّل المستخدم تاريخ النهاية يدوياً؟ إن نعم لا نلمسه
  const [endTouched, setEndTouched] = useState(Boolean(initialEnd));

  const autoFill = (pid: string, start: string, force = false) => {
    if (!pid || !start) return;
    if (endTouched && !force) return;
    const program = programs.find((p) => p.id === pid);
    if (!program) return;
    setEndDate(addDays(start, Math.max(program.durationDays - 1, 0)));
  };

  return (
    <>
      <Field label="البرنامج السياحي" required>
        <Select
          name="programId"
          required
          value={programId}
          onChange={(e) => {
            setProgramId(e.target.value);
            autoFill(e.target.value, startDate, true);
            setEndTouched(false);
          }}
        >
          <option value="" disabled>
            اختر برنامجاً
          </option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.durationDays} أيام)
            </option>
          ))}
        </Select>
      </Field>

      <Field label="تاريخ البداية" required>
        <Input
          type="date"
          name="startDate"
          required
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            autoFill(programId, e.target.value);
          }}
        />
      </Field>

      <Field label="تاريخ النهاية (يُملأ تلقائياً من مدة البرنامج)">
        <Input
          type="date"
          name="endDate"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setEndTouched(true);
          }}
        />
      </Field>
    </>
  );
}
