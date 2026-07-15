import { PageHeader, Card, Field, Input, Textarea, LinkButton, Button } from "@/components/ui";
import { createGuide } from "../actions";

export default function NewGuidePage() {
  return (
    <div>
      <PageHeader title="إضافة مرشد سياحي" description="إدخال بيانات مرشد سياحي جديد" />

      <Card className="p-5 max-w-2xl">
        <form action={createGuide} className="space-y-4">
          <Field label="الاسم">
            <Input name="name" required />
          </Field>
          <Field label="اللغات">
            <Input name="languages" placeholder="مثال: عربي، إنجليزي" />
          </Field>
          <Field label="رقم الهاتف">
            <Input name="phone" />
          </Field>
          <Field label="البريد الإلكتروني">
            <Input name="email" type="email" />
          </Field>
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
