"use client";

// صفة الموقّع على شهادة العمل: اختيار جاهز (يُكتب صحيحاً بالعربية والفرنسية) أو نص حر.
// مثال: شهادة عمل للمسيّر نفسه يوقّعها المالك.
import { useState } from "react";
import { Field, Select, Input } from "@/components/ui";
import { SIGNER_ROLES } from "@/lib/workCertificate";

export function SignerPicker({ initial }: { initial: string }) {
  // القيمة المحفوظة: مفتاح جاهز، أو نص حر قديم/مكتوب، أو فارغ (المسيّر افتراضياً)
  const isKey = initial in SIGNER_ROLES;
  const [key, setKey] = useState(isKey ? initial : initial ? "custom" : "manager_m");
  return (
    <>
      <Field label="صفة الموقّع">
        <Select name="signerRole" value={key} onChange={(e) => setKey(e.target.value)}>
          {Object.entries(SIGNER_ROLES).map(([k, r]) => (
            <option key={k} value={k}>
              {r.label}
            </option>
          ))}
          <option value="custom">صفة أخرى (أكتبها)</option>
        </Select>
      </Field>
      {key === "custom" && (
        <Field label="اكتب الصفة كما تظهر في الشهادة">
          <Input
            name="signerTitleCustom"
            defaultValue={isKey ? "" : initial}
            placeholder="مثال: Le Président du conseil / رئيس المجلس"
          />
        </Field>
      )}
    </>
  );
}
