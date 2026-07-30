import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { updateOpeningBalanceItem } from "../actions";
import { OpeningBalanceForm } from "../OpeningBalanceForm";

export default async function EditOpeningBalanceItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await prisma.openingBalance.findUnique({ where: { id } });
  if (!item) notFound();

  return (
    <div>
      <PageHeader title="تعديل بند الميزانية الافتتاحية" description="عدّل بيانات البند ثم احفظ" />

      <OpeningBalanceForm
        action={updateOpeningBalanceItem.bind(null, id)}
        submitLabel="حفظ التعديلات"
        initial={{
          fiscalYear: item.fiscalYear,
          itemType: item.itemType,
          itemName: item.itemName,
          amount: String(item.amount),
          notes: item.notes ?? "",
        }}
      />
    </div>
  );
}
