"use client";

// اختيار الرحلة اختياري: إن تُركت فارغة تظهر خانات لكتابة البرنامج والعميل يدوياً
import { useState } from "react";
import { Field, Select } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { FieldValues } from "@/lib/taskOrderFields";
import { FieldGroupInputs } from "./FieldGroupInputs";

export function TripPicker({
  trips,
  initialTripId,
  initialFields,
}: {
  trips: { id: string; startDate: Date; programName: string; customerName: string }[];
  initialTripId: string;
  initialFields: FieldValues;
}) {
  const [tripId, setTripId] = useState(initialTripId);
  return (
    <div className="space-y-3">
      <Field label="الرحلة (اختياري)">
        <Select name="tripId" value={tripId} onChange={(e) => setTripId(e.target.value)}>
          <option value="">بدون رحلة — أكتب البيانات يدوياً</option>
          {trips.map((t) => (
            <option key={t.id} value={t.id}>
              {t.programName} — {t.customerName} — {formatDate(t.startDate)}
            </option>
          ))}
        </Select>
      </Field>
      {!tripId && <FieldGroupInputs group="trip" initial={initialFields} />}
    </div>
  );
}
