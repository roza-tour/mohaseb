import { Card, Field, Select, Input, Textarea, Button, LinkButton } from "@/components/ui";
import { formatDateForInput, } from "@/lib/format";
import { TEMPLATE_VARIABLES, type DocumentStyle } from "@/lib/documents";
import { StyleFields } from "./StyleFields";

export type DocumentInitial = {
  title: string;
  body: string;
  customerId: string;
  docDate: string;
  showStamp: boolean;
  style: DocumentStyle;
};

// نموذج المستند المشترك بين الإنشاء والتعديل
export function DocumentForm({
  action,
  customers,
  initial,
  tripId = "",
  submitLabel = "إصدار المستند (PDF)",
  isEdit = false,
}: {
  action: (formData: FormData) => void;
  customers: { id: string; name: string }[];
  initial: DocumentInitial;
  tripId?: string;
  submitLabel?: string;
  isEdit?: boolean;
}) {
  return (
    <Card className="p-5 max-w-3xl">
      <form action={action} className="space-y-4">
        {!isEdit && <input type="hidden" name="tripId" value={tripId} />}

        <Field label="عنوان المستند (يظهر بخط كبير في الـ PDF)">
          <Input name="title" defaultValue={initial.title} placeholder="مثال: شهادة حجز" />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="العميل (اختياري)">
            <Select name="customerId" defaultValue={initial.customerId}>
              <option value="">بدون عميل</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="تاريخ المستند">
            <Input
              type="date"
              name="docDate"
              defaultValue={initial.docDate || formatDateForInput(new Date())}
            />
          </Field>
        </div>

        {!isEdit && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="اسم القنصلية / الجهة الموجَّه إليها (اختياري)">
              <Input name="consulate" placeholder="مثال: Consulat Général de France à Alger" />
            </Field>
            <Field label="رقم جواز سفر المسافر (اختياري)">
              <Input name="passport" placeholder="مثال: GI937083" />
            </Field>
          </div>
        )}

        <Field label="نص المستند">
          <Textarea
            name="body"
            rows={14}
            defaultValue={initial.body}
            placeholder="اكتب نص المستند هنا... كل سطر فارغ يبدأ فقرة جديدة في الـ PDF"
          />
        </Field>

        {!isEdit && (
          <p className="text-xs text-slate-500">
            المتغيرات المتاحة في القوالب (تُستبدل تلقائياً عند تحميل قالب مع رحلة):{" "}
            {TEMPLATE_VARIABLES.map((v) => `${v.token} = ${v.label}`).join("، ")}
          </p>
        )}

        <StyleFields style={initial.style} />

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="showStamp" defaultChecked={initial.showStamp} />
          إظهار ختم الوكالة على المستند
        </label>

        <div className="flex items-center gap-2">
          <Button type="submit">{submitLabel}</Button>
          <LinkButton href="/documents" variant="secondary">
            إلغاء
          </LinkButton>
        </div>
      </form>
    </Card>
  );
}
