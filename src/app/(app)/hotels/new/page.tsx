import { PageHeader, Card, Field, Input, Textarea, LinkButton, Button } from "@/components/ui";
import { createHotel } from "../actions";

export default function NewHotelPage() {
  return (
    <div>
      <PageHeader title="إضافة فندق" description="إدخال بيانات فندق جديد" />

      <Card className="p-5 max-w-2xl">
        <form action={createHotel} className="space-y-4">
          <Field label="الاسم">
            <Input name="name" />
          </Field>
          <Field label="المدينة">
            <Input name="city" />
          </Field>
          <Field label="الشخص المسؤول">
            <Input name="contactPerson" />
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
            <LinkButton href="/hotels" variant="secondary">
              إلغاء
            </LinkButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
