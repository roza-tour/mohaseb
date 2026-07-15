import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Field, Select, Input, Textarea, Button, LinkButton, ErrorBanner } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { createTaskOrder } from "../actions";
import { AssigneeFields } from "../AssigneeFields";

export default async function NewTaskOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const tripId = typeof sp.tripId === "string" ? sp.tripId : "";
  const error = sp.error;

  const [trips, guides, drivers] = await Promise.all([
    prisma.trip.findMany({
      include: { program: true, customer: true },
      orderBy: { startDate: "desc" },
    }),
    prisma.guide.findMany({ orderBy: { name: "asc" } }),
    prisma.driver.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="أمر تكليف جديد" description="إصدار أمر تكليف بمهمة لمرشد سياحي أو سائق" />

      <ErrorBanner message={error} />

      {trips.length === 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 max-w-2xl">
          لا توجد رحلات بعد — أمر التكليف يرتبط برحلة. أنشئ رحلة أولاً من صفحة الرحلات.
        </div>
      )}

      <Card className="p-5 max-w-2xl">
        <form action={createTaskOrder} className="space-y-4">
          <Field label="الرحلة">
            <Select name="tripId" required defaultValue={tripId}>
              <option value="">اختر الرحلة...</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.program.name} — {t.customer.name} — {formatDate(t.startDate)}
                </option>
              ))}
            </Select>
          </Field>

          <AssigneeFields guides={guides} drivers={drivers} />

          <Field label="تاريخ المهمة">
            <Input type="date" name="taskDate" required />
          </Field>

          <Field label="تفاصيل المهمة">
            <Textarea
              name="details"
              rows={4}
              placeholder="مثال: استقبال العميل من المطار الساعة ٩ صباحاً وتوصيله إلى الفندق..."
            />
          </Field>

          <div className="flex items-center gap-2">
            <Button type="submit">إصدار الأمر (PDF)</Button>
            <LinkButton href="/task-orders" variant="secondary">
              إلغاء
            </LinkButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
