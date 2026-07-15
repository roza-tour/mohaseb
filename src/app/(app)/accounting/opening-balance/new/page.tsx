import { PageHeader, Card, Field, Input, Textarea, Select, Button, LinkButton } from "@/components/ui";
import { createOpeningBalanceItem } from "../actions";

export default async function NewOpeningBalanceItemPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const yearParam = Array.isArray(params.year) ? params.year[0] : params.year;
  const year = yearParam ? parseInt(yearParam, 10) : currentYear;
  const safeYear = Number.isFinite(year) ? year : currentYear;

  return (
    <div>
      <PageHeader title="إضافة بند للميزانية الافتتاحية" description="إدخال بند أصول أو التزامات أو حقوق ملكية" />

      <Card className="p-5 max-w-2xl">
        <form action={createOpeningBalanceItem} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="السنة المالية">
              <Input type="number" name="fiscalYear" defaultValue={safeYear} required />
            </Field>

            <Field label="نوع البند">
              <Select name="itemType" defaultValue="ASSET" required>
                <option value="ASSET">أصل</option>
                <option value="LIABILITY">التزام</option>
                <option value="EQUITY">حقوق ملكية</option>
              </Select>
            </Field>

            <Field label="اسم البند">
              <Input name="itemName" required />
            </Field>

            <Field label="المبلغ">
              <Input type="number" name="amount" step="0.01" required />
            </Field>
          </div>

          <Field label="ملاحظات">
            <Textarea name="notes" rows={3} />
          </Field>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit">حفظ</Button>
            <LinkButton href={`/accounting/opening-balance?year=${safeYear}`} variant="secondary">
              إلغاء
            </LinkButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
