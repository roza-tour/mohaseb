import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Field, Input, Textarea, Select, Button, LinkButton } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { createTransaction } from "../actions";

const CURRENCIES = ["JOD", "USD", "EUR", "SAR", "EGP"];

export default async function NewTransactionPage() {
  const trips = await prisma.trip.findMany({
    include: { program: true, customer: true },
    orderBy: { startDate: "desc" },
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader title="قيد محاسبي جديد" description="إضافة إيراد أو مصروف جديد" />

      <Card className="p-5 max-w-2xl">
        <form action={createTransaction} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="النوع">
              <Select name="type" defaultValue="INCOME" required>
                <option value="INCOME">إيراد</option>
                <option value="EXPENSE">مصروف</option>
              </Select>
            </Field>

            <Field label="التصنيف">
              <Input name="category" placeholder="مثال: رسوم برنامج، إيجار مكتب، رواتب" required />
            </Field>

            <Field label="المبلغ">
              <Input type="number" name="amount" step="0.01" min="0.01" required />
            </Field>

            <Field label="العملة">
              <Select name="currency" defaultValue="JOD">
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="التاريخ">
              <Input type="date" name="date" defaultValue={today} required />
            </Field>

            <Field label="الرحلة المرتبطة">
              <Select name="tripId" defaultValue="">
                <option value="">بدون ارتباط برحلة</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.program.name} — {t.customer.name} — {formatDate(t.startDate)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="الوصف">
            <Textarea name="description" rows={3} />
          </Field>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit">حفظ</Button>
            <LinkButton href="/accounting/transactions" variant="secondary">
              إلغاء
            </LinkButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
