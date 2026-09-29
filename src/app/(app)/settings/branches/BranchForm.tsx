import { Card, Field, Input, Textarea, Button, Badge } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import type { Branch } from "@prisma/client";

// نموذج فرع واحد — يُستعمل للإضافة (branch = null) وللتعديل معاً
export function BranchForm({
  action,
  branch,
  onDelete,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  branch?: Branch | null;
  onDelete?: () => Promise<void>;
  submitLabel: string;
}) {
  return (
    <Card className="p-5">
      <form action={action} className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-bold text-slate-800">
            {branch ? branch.name : "فرع جديد"}{" "}
            {branch && !branch.isActive ? <Badge color="slate">غير مُفعَّل</Badge> : null}
          </h2>
          {onDelete ? <DeleteButton action={onDelete} /> : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="اسم الفرع (يظهر في ترويسة الفاتورة)" required>
            <Input name="name" defaultValue={branch?.name ?? ""} placeholder="مثال: كيميت ترافيل" />
          </Field>
          <Field label="السطر الفرعي تحت الاسم">
            <Input name="tagline" defaultValue={branch?.tagline ?? ""} placeholder="مثال: خدمات سياحية — مصر" />
          </Field>
          <Field label="العنوان">
            <Input name="address" defaultValue={branch?.address ?? ""} />
          </Field>
          <Field label="الهاتف">
            <Input name="phone" dir="ltr" defaultValue={branch?.phone ?? ""} />
          </Field>
          <Field label="البريد الإلكتروني">
            <Input name="email" dir="ltr" type="email" defaultValue={branch?.email ?? ""} />
          </Field>
          <Field label="الموقع الإلكتروني">
            <Input name="website" dir="ltr" defaultValue={branch?.website ?? ""} />
          </Field>
          <Field label="رقم السجل التجاري N° RC">
            <Input name="rc" dir="ltr" defaultValue={branch?.rc ?? ""} />
          </Field>
          <Field label="ترتيب الظهور في القائمة">
            <Input type="number" name="sortOrder" defaultValue={branch?.sortOrder ?? 0} />
          </Field>
        </div>

        <Field label="بيانات الحساب البنكي للتحويل (تظهر في الفاتورة عند تفعيلها)">
          <Textarea
            name="bankDetails"
            rows={4}
            defaultValue={branch?.bankDetails ?? ""}
            placeholder={"اسم البنك: ...\nاسم صاحب الحساب: ...\nرقم الحساب / RIB: ...\nIBAN: ...\nSWIFT: ..."}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="شعار الفرع (اختياري)">
            <Input type="file" name="logo" accept="image/png,image/jpeg,image/webp" />
          </Field>
          <Field label="ختم الفرع (اختياري)">
            <Input type="file" name="stamp" accept="image/png,image/jpeg,image/webp" />
          </Field>
          <Field label="لون الترويسة">
            <Input
              type="color"
              name="letterheadColor"
              defaultValue={branch?.letterheadColor ?? "#1f3864"}
              className="h-10 w-24 p-1 cursor-pointer"
            />
          </Field>
        </div>

        <p className="text-xs text-slate-500">
          أي حقل تتركه فارغاً يأخذ قيمته من إعدادات الوكالة الأم.
        </p>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="isActive" defaultChecked={branch?.isActive ?? true} />
          مُفعَّل (يظهر في قائمة اختيار الفرع عند إصدار فاتورة)
        </label>

        <Button type="submit">{submitLabel}</Button>
      </form>
    </Card>
  );
}
