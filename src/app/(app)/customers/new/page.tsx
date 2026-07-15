import { PageHeader, Card, Field, Input, Textarea, LinkButton, Button } from "@/components/ui";
import { createCustomer } from "../actions";

export default function NewCustomerPage() {
  return (
    <div>
      <PageHeader title="إضافة عميل" description="إدخال بيانات عميل جديد" />

      <Card className="p-5 max-w-2xl">
        <form action={createCustomer} className="space-y-4">
          <Field label="الاسم">
            <Input name="name" required />
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
            <LinkButton href="/customers" variant="secondary">
              إلغاء
            </LinkButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
