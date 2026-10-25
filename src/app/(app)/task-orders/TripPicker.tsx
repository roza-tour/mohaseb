"use client";

// الرحلة: إما اختيار رحلة مسجّلة، أو إدخال بياناتها يدوياً (الرحلة، اسم المسافر، جنسيته...)
// كل ذلك اختياري — لا شيء إلزامي هنا.
import { useState } from "react";
import { Field, Select } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { FieldValues } from "@/lib/taskOrderFields";
import { FieldGroupInputs } from "./FieldGroupInputs";

type Mode = "trip" | "manual";

export function TripPicker({
  trips,
  initialTripId,
  initialFields,
}: {
  trips: { id: string; startDate: Date; programName: string; customerName: string }[];
  initialTripId: string;
  initialFields: FieldValues;
}) {
  // الوضع الابتدائي: رحلة إن كان الأمر مربوطاً بها، ويدوي إن كُتبت بياناته يدوياً
  const hasManual = ["tripProgram", "tripCustomer", "tripPax", "tripStart", "tripEnd"].some((k) => initialFields[k]);
  const [mode, setMode] = useState<Mode>(
    initialTripId ? "trip" : hasManual || trips.length === 0 ? "manual" : "trip"
  );
  const [tripId, setTripId] = useState(initialTripId);

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`flex-1 rounded-lg px-3 py-2 text-sm border transition ${
        mode === m
          ? "bg-sky-600 text-white border-sky-600"
          : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {tab("trip", "اختيار رحلة مسجّلة")}
        {tab("manual", "إدخال الرحلة يدوياً")}
      </div>

      {mode === "trip" ? (
        <>
          <Field label="الرحلة">
            <Select name="tripId" value={tripId} onChange={(e) => setTripId(e.target.value)}>
              <option value="">اختر الرحلة...</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.programName} — {t.customerName} — {formatDate(t.startDate)}
                </option>
              ))}
            </Select>
          </Field>
          {/* الرحلة المسجّلة لا تحمل الجنسية — تُكتب هنا إن لزمت */}
          <FieldGroupInputs group="trip" initial={initialFields} onlyWithTrip title="بيانات المسافر" />
        </>
      ) : (
        <>
          <input type="hidden" name="tripId" value="" />
          <FieldGroupInputs group="trip" initial={initialFields} />
        </>
      )}
    </div>
  );
}
