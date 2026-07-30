import { Card, Field, Input, Textarea, Select, Button, LinkButton } from "@/components/ui";

export type OpeningBalanceInitial = {
  fiscalYear: number;
  itemType: string;
  itemName: string;
  amount: string;
  notes: string;
};

// نموذج بند الميزانية الافتتاحية المشترك بين الإضافة والتعديل
export function OpeningBalanceForm({
  action,
  initial,
  submitLabel = "حفظ",
}: {
  action: (formData: FormData) => void;
  initial: OpeningBalanceInitial;
  submitLabel?: string;
}) {
  return (
    <Card className="p-5 max-w-2xl">
      <form action={action} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="السنة المالية">
            <Input type="number" name="fiscalYear" defaultValue={initial.fiscalYear} />
          </Field>

          <Field label="نوع البند">
            <Select name="itemType" defaultValue={initial.itemType}>
              <option value="ASSET">أصل</option>
              <option value="LIABILITY">التزام</option>
              <option value="EQUITY">حقوق ملكية</option>
            </Select>
          </Field>

          <Field label="اسم البند">
            <Input name="itemName" defaultValue={initial.itemName} />
          </Field>

          <Field label="المبلغ">
            <Input type="number" name="amount" step="0.01" defaultValue={initial.amount} />
          </Field>
        </div>

        <Field label="ملاحظات">
          <Textarea name="notes" rows={3} defaultValue={initial.notes} />
        </Field>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit">{submitLabel}</Button>
          <LinkButton href={`/accounting/opening-balance?year=${initial.fiscalYear}`} variant="secondary">
            إلغاء
          </LinkButton>
        </div>
      </form>
    </Card>
  );
}
