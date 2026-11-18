import { Field, Input, Select, Textarea } from "@/components/ui";
import { formatDateForInput } from "@/lib/format";
import type { Employee } from "@prisma/client";
import { PAY_TYPES } from "@/lib/salaryStatement";

const d = (v: Date | null | undefined) => (v ? formatDateForInput(v) : "");

// خانات الموظف — كلها اختيارية، والفارغ لا يظهر في شهادة العمل
export function EmployeeFields({ e }: { e?: Employee | null }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="الاسم واللقب">
          <Input name="name" defaultValue={e?.name ?? ""} />
        </Field>
        <Field label="الصيغة في الشهادة">
          <Select name="gender" defaultValue={e?.gender ?? "M"}>
            <option value="M">السيد (M.)</option>
            <option value="F">السيدة (Mme)</option>
          </Select>
        </Field>
        <Field label="تاريخ الميلاد">
          <Input type="date" name="birthDate" defaultValue={d(e?.birthDate)} />
        </Field>
        <Field label="مكان الميلاد">
          <Input name="birthPlace" defaultValue={e?.birthPlace ?? ""} />
        </Field>
        <Field label="رقم بطاقة التعريف الوطنية">
          <Input name="idNumber" defaultValue={e?.idNumber ?? ""} />
        </Field>
        <Field label="رقم الضمان الاجتماعي">
          <Input name="socialSecurityNo" defaultValue={e?.socialSecurityNo ?? ""} />
        </Field>
        <Field label="الوظيفة">
          <Input name="jobTitle" defaultValue={e?.jobTitle ?? ""} placeholder="مثال: مرشدة سياحية / Agent de voyages" />
        </Field>
        <div />
        <Field label="تاريخ بداية العمل">
          <Input type="date" name="startDate" defaultValue={d(e?.startDate)} />
        </Field>
        <Field label="تاريخ نهاية العمل (اتركه فارغاً إن كان ما زال يعمل)">
          <Input type="date" name="endDate" defaultValue={d(e?.endDate)} />
        </Field>
      </div>
      <fieldset className="rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium text-slate-700">
          💰 نظام الأجر <span className="text-xs font-normal text-slate-400">(لبيان الراتب — اختياري)</span>
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="نوع الأجر">
            <Select name="payType" defaultValue={e?.payType ?? "salary"}>
              {Object.entries(PAY_TYPES).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="الراتب الشهري الثابت">
            <Input
              type="number"
              name="baseSalary"
              min={0}
              step="0.01"
              defaultValue={e?.baseSalary ?? ""}
              placeholder="مثال: 45000"
            />
          </Field>
          <Field label="نسبة العمولة (%)">
            <Input
              type="number"
              name="commissionRate"
              min={0}
              max={100}
              step="0.01"
              defaultValue={e?.commissionRate ?? ""}
              placeholder="مثال: 10"
            />
          </Field>
        </div>
      </fieldset>
      <Field label="ملاحظات">
        <Textarea name="notes" rows={2} defaultValue={e?.notes ?? ""} />
      </Field>
    </div>
  );
}
