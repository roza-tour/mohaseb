import { PageHeader, Card, Field, Input, Textarea, LinkButton, Button } from "@/components/ui";
import { createDriver } from "../actions";

export default function NewDriverPage() {
  return (
    <div>
      <PageHeader title="إضافة سائق" description="إدخال بيانات سائق جديد" />

      <Card className="p-5 max-w-2xl">
        <form action={createDriver} className="space-y-4">
          <Field label="الاسم">
            <Input name="name" required />
          </Field>
          <Field label="بيانات المركبة">
            <Input name="vehicleInfo" placeholder="نوع السيارة ورقم اللوحة" />
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
            <LinkButton href="/drivers" variant="secondary">
              إلغاء
            </LinkButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
