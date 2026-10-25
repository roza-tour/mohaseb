import { Field, Input } from "@/components/ui";
import { TASK_FIELDS, GROUP_TITLES, type FieldGroup, type FieldValues } from "@/lib/taskOrderFields";

// مجموعة خانات اختيارية في إطار بعنوان — كل الخانات تُترك فارغة إن لم تلزم
// onlyWithTrip: يعرض فقط خانات الرحلة التي تبقى مع رحلة مسجّلة (مثل الجنسية)
export function FieldGroupInputs({
  group,
  initial,
  onlyWithTrip = false,
  title,
}: {
  group: FieldGroup;
  initial: FieldValues;
  onlyWithTrip?: boolean;
  title?: string;
}) {
  const fields = TASK_FIELDS.filter((f) => f.group === group && (!onlyWithTrip || f.withTrip));
  return (
    <fieldset className="rounded-lg border border-slate-200 p-4">
      <legend className="px-1 text-sm font-medium text-slate-700">
        {title ?? GROUP_TITLES[group].ar} <span className="text-xs font-normal text-slate-400">(اختياري — الفارغ لا يظهر في الأمر)</span>
      </legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map((f) => (
          <Field key={f.key} label={f.ar}>
            <Input
              type={f.type}
              name={`f_${f.key}`}
              defaultValue={initial[f.key] ?? ""}
              placeholder={f.placeholder}
            />
          </Field>
        ))}
      </div>
    </fieldset>
  );
}
