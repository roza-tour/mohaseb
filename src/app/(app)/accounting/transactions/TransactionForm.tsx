import { Card, Field, Input, Textarea, Select, Button, LinkButton } from "@/components/ui";
import { formatDate, nameOr } from "@/lib/format";

const CURRENCIES = ["DZD", "EUR", "USD", "TND", "MAD", "SAR"];

export type TransactionInitial = {
  type: string;
  category: string;
  amount: string;
  currency: string;
  date: string;
  tripId: string;
  description: string;
};

// نموذج القيد المحاسبي المشترك بين الإضافة والتعديل
export function TransactionForm({
  action,
  trips,
  initial,
  submitLabel = "حفظ",
  locked = false,
}: {
  action: (formData: FormData) => void;
  trips: { id: string; startDate: Date; program: { name: string }; customer: { name: string } }[];
  initial: TransactionInitial;
  submitLabel?: string;
  locked?: boolean;
}) {
  return (
    <Card className="p-5 max-w-2xl">
      <form action={action} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="النوع" required>
            <Select name="type" defaultValue={initial.type} required disabled={locked}>
              <option value="INCOME">إيراد</option>
              <option value="EXPENSE">مصروف</option>
            </Select>
          </Field>

          <Field label="التصنيف">
            <Input
              name="category"
              defaultValue={initial.category}
              disabled={locked}
              placeholder="مثال: رسوم برنامج، إيجار مكتب، رواتب"
            />
          </Field>

          <Field label="المبلغ" required>
            <Input
              type="number"
              name="amount"
              step="0.01"
              min="0.01"
              defaultValue={initial.amount}
              disabled={locked}
              required
            />
          </Field>

          <Field label="العملة">
            <Select name="currency" defaultValue={initial.currency} disabled={locked}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="التاريخ" required>
            <Input type="date" name="date" defaultValue={initial.date} disabled={locked} required />
          </Field>

          <Field label="الرحلة المرتبطة">
            <Select name="tripId" defaultValue={initial.tripId} disabled={locked}>
              <option value="">بدون ارتباط برحلة</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {nameOr(t.program.name)} — {nameOr(t.customer.name)} — {formatDate(t.startDate)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="الوصف">
          <Textarea name="description" rows={3} defaultValue={initial.description} disabled={locked} />
        </Field>

        <div className="flex items-center gap-3 pt-2">
          {!locked && <Button type="submit">{submitLabel}</Button>}
          <LinkButton href="/accounting/transactions" variant="secondary">
            {locked ? "رجوع" : "إلغاء"}
          </LinkButton>
        </div>
      </form>
    </Card>
  );
}
