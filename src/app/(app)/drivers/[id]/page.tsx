import { FieldGroupInputs } from "@/app/(app)/task-orders/FieldGroupInputs";
import { driverProfile } from "@/lib/taskOrderFields";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Field, Input, Textarea, LinkButton, Button } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { updateDriver, deleteDriver } from "../actions";

export default async function EditDriverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) notFound();

  return (
    <div>
      <PageHeader title="تعديل بيانات سائق" description={driver.name} />

      <Card className="p-5 max-w-3xl">
        <form action={updateDriver.bind(null, id)} className="space-y-4">
          <Field label="الاسم">
            <Input name="name" defaultValue={driver.name} />
          </Field>
          <Field label="رقم الهاتف">
            <Input name="phone" defaultValue={driver.phone ?? ""} />
          </Field>
          <Field label="البريد الإلكتروني">
            <Input name="email" type="email" defaultValue={driver.email ?? ""} />
          </Field>
          <FieldGroupInputs group="vehicle" initial={driverProfile(driver)} title="بيانات السائق والمركبة" hint="اختياري — تُملأ تلقائياً في كل أمر تكليف" />
          <Field label="ملاحظات">
            <Textarea name="notes" rows={3} defaultValue={driver.notes ?? ""} />
          </Field>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit">حفظ التعديلات</Button>
            <LinkButton href="/drivers" variant="secondary">
              إلغاء
            </LinkButton>
            <div className="flex-1" />
            <DeleteButton action={deleteDriver.bind(null, id)} />
          </div>
        </form>
      </Card>
    </div>
  );
}
