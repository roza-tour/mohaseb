import { FieldGroupInputs } from "@/app/(app)/task-orders/FieldGroupInputs";
import { guideProfile } from "@/lib/taskOrderFields";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Field, Input, Textarea, LinkButton, Button } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { updateGuide, deleteGuide } from "../actions";

export default async function EditGuidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guide = await prisma.guide.findUnique({ where: { id } });
  if (!guide) notFound();

  return (
    <div>
      <PageHeader title="تعديل بيانات مرشد سياحي" description={guide.name} />

      <Card className="p-5 max-w-3xl">
        <form action={updateGuide.bind(null, id)} className="space-y-4">
          <Field label="الاسم">
            <Input name="name" defaultValue={guide.name} />
          </Field>
          <Field label="رقم الهاتف">
            <Input name="phone" defaultValue={guide.phone ?? ""} />
          </Field>
          <Field label="البريد الإلكتروني">
            <Input name="email" type="email" defaultValue={guide.email ?? ""} />
          </Field>
          <FieldGroupInputs group="guide" initial={guideProfile(guide)} title="بيانات المرشد والاعتماد" hint="اختياري — تُملأ تلقائياً في كل أمر تكليف" />
          <Field label="ملاحظات">
            <Textarea name="notes" rows={3} defaultValue={guide.notes ?? ""} />
          </Field>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit">حفظ التعديلات</Button>
            <LinkButton href="/guides" variant="secondary">
              إلغاء
            </LinkButton>
            <div className="flex-1" />
            <DeleteButton action={deleteGuide.bind(null, id)} />
          </div>
        </form>
      </Card>
    </div>
  );
}
