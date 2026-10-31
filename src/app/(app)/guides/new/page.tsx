import { FieldGroupInputs } from "@/app/(app)/task-orders/FieldGroupInputs";
import { PageHeader, Card, Field, Input, Textarea, LinkButton, Button } from "@/components/ui";
import { createGuide } from "../actions";

export default function NewGuidePage() {
  return (
    <div>
      <PageHeader title="إضافة مرشد سياحي" description="إدخال بيانات مرشد سياحي جديد" />

      <Card className="p-5 max-w-3xl">
        <form action={createGuide} className="space-y-4">
          <Field label="الاسم">
            <Input name="name" />
          </Field>
          <Field label="رقم الهاتف">
            <Input name="phone" />
          </Field>
          <Field label="البريد الإلكتروني">
            <Input name="email" type="email" />
          </Field>
          <FieldGroupInputs group="guide" initial={{}} title="بيانات المرشد والاعتماد" hint="اختياري — تُملأ تلقائياً في كل أمر تكليف" />
          <Field label="ملاحظات">
            <Textarea name="notes" rows={3} />
          </Field>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit">حفظ</Button>
            <LinkButton href="/guides" variant="secondary">
              إلغاء
            </LinkButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
