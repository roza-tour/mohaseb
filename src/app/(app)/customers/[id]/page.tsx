import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Field, Input, Textarea, LinkButton, Button } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { updateCustomer, deleteCustomer } from "../actions";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  return (
    <div>
      <PageHeader title="تعديل بيانات عميل" description={customer.name} />

      <Card className="p-5 max-w-2xl">
        <form action={updateCustomer.bind(null, id)} className="space-y-4">
          <Field label="الاسم">
            <Input name="name" required defaultValue={customer.name} />
          </Field>
          <Field label="رقم الهاتف">
            <Input name="phone" defaultValue={customer.phone ?? ""} />
          </Field>
          <Field label="البريد الإلكتروني">
            <Input name="email" type="email" defaultValue={customer.email ?? ""} />
          </Field>
          <Field label="ملاحظات">
            <Textarea name="notes" rows={3} defaultValue={customer.notes ?? ""} />
          </Field>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit">حفظ التعديلات</Button>
            <LinkButton href="/customers" variant="secondary">
              إلغاء
            </LinkButton>
            <div className="flex-1" />
            <DeleteButton action={deleteCustomer.bind(null, id)} />
          </div>
        </form>
      </Card>
    </div>
  );
}
