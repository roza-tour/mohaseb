"use client";

// اختيار المكلَّف: عند اختيار سائق/مرشد تُملأ بياناته المحفوظة في ملفه
// (اللوحة، الرخصة، الاعتماد...) تلقائياً، ويمكن تعديلها لهذا الأمر وحده.
import { useState } from "react";
import { Field, Select } from "@/components/ui";
import type { FieldGroup, FieldValues } from "@/lib/taskOrderFields";
import { FieldGroupInputs } from "./FieldGroupInputs";

export type Assignee = { id: string; name: string; profile: FieldValues };

export function AssigneePicker({
  isDriver,
  people,
  initialId,
  initialFields,
}: {
  isDriver: boolean;
  people: Assignee[];
  initialId: string;
  initialFields: FieldValues;
}) {
  const group: FieldGroup = isDriver ? "vehicle" : "guide";
  const [personId, setPersonId] = useState(initialId);
  // تغيير «version» يعيد بناء الخانات بقيم الملف الجديد
  const [prefill, setPrefill] = useState({ values: initialFields, version: 0 });

  const choose = (id: string) => {
    setPersonId(id);
    const profile = people.find((p) => p.id === id)?.profile ?? {};
    setPrefill((prev) => ({ values: profile, version: prev.version + 1 }));
  };

  return (
    <>
      <Field label={isDriver ? "السائق" : "المرشد السياحي"} required>
        <Select
          name={isDriver ? "driverId" : "guideId"}
          required
          value={personId}
          onChange={(e) => choose(e.target.value)}
        >
          <option value="">{isDriver ? "اختر السائق..." : "اختر المرشد..."}</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name || "بلا اسم"}
            </option>
          ))}
        </Select>
      </Field>

      <FieldGroupInputs
        key={prefill.version}
        group={group}
        initial={prefill.values}
        hint="تُملأ تلقائياً من ملف المكلَّف — عدّلها لهذا الأمر إن لزم، والفارغ لا يظهر"
      />
    </>
  );
}
