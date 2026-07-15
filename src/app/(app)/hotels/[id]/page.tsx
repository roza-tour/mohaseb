import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Field, Input, Textarea, LinkButton, Button } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { updateHotel, deleteHotel } from "../actions";

export default async function EditHotelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hotel = await prisma.hotel.findUnique({ where: { id } });
  if (!hotel) notFound();

  return (
    <div>
      <PageHeader title="تعديل بيانات فندق" description={hotel.name} />

      <Card className="p-5 max-w-2xl">
        <form action={updateHotel.bind(null, id)} className="space-y-4">
          <Field label="الاسم">
            <Input name="name" required defaultValue={hotel.name} />
          </Field>
          <Field label="المدينة">
            <Input name="city" defaultValue={hotel.city ?? ""} />
          </Field>
          <Field label="الشخص المسؤول">
            <Input name="contactPerson" defaultValue={hotel.contactPerson ?? ""} />
          </Field>
          <Field label="رقم الهاتف">
            <Input name="phone" defaultValue={hotel.phone ?? ""} />
          </Field>
          <Field label="البريد الإلكتروني">
            <Input name="email" type="email" defaultValue={hotel.email ?? ""} />
          </Field>
          <Field label="ملاحظات">
            <Textarea name="notes" rows={3} defaultValue={hotel.notes ?? ""} />
          </Field>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit">حفظ التعديلات</Button>
            <LinkButton href="/hotels" variant="secondary">
              إلغاء
            </LinkButton>
            <div className="flex-1" />
            <DeleteButton action={deleteHotel.bind(null, id)} />
          </div>
        </form>
      </Card>
    </div>
  );
}
