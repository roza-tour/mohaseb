"use client";

import { useState } from "react";
import { Field, Select } from "@/components/ui";

type Option = { id: string; name: string };

export function AssigneeFields({ guides, drivers }: { guides: Option[]; drivers: Option[] }) {
  const [assigneeType, setAssigneeType] = useState<"GUIDE" | "DRIVER">("GUIDE");

  return (
    <div className="space-y-3">
      <Field label="الصفة">
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="assigneeType"
              value="GUIDE"
              checked={assigneeType === "GUIDE"}
              onChange={() => setAssigneeType("GUIDE")}
            />
            مرشد سياحي
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="assigneeType"
              value="DRIVER"
              checked={assigneeType === "DRIVER"}
              onChange={() => setAssigneeType("DRIVER")}
            />
            سائق
          </label>
        </div>
      </Field>

      {assigneeType === "GUIDE" ? (
        <Field label="المرشد السياحي">
          <Select name="guideId" required>
            <option value="">اختر المرشد...</option>
            {guides.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <Field label="السائق">
          <Select name="driverId" required>
            <option value="">اختر السائق...</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </div>
  );
}
