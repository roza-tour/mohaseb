import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Field, Input, Textarea, Select, Button, ErrorBanner } from "@/components/ui";
import { formatDateForInput } from "@/lib/format";
import { updateTrip } from "../../actions";
import { TRIP_STATUSES, TRIP_STATUS_LABELS, CURRENCIES } from "../../statusLabels";
import { ProgramDatesFields } from "../../ProgramDatesFields";

export default async function EditTripPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const [trip, customers, programs] = await Promise.all([
    prisma.trip.findUnique({ where: { id } }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.tourProgram.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!trip) notFound();

  return (
    <div>
      <PageHeader title="تعديل الرحلة" description="تعديل بيانات الرحلة" />

      <ErrorBanner message={sp.error} />

      <Card className="p-5">
        <form action={updateTrip.bind(null, id)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="العميل" required>
              {customers.length === 0 ? (
                <p className="text-xs text-slate-500">
                  لا يوجد عملاء بعد.{" "}
                  <Link href="/customers/new" className="text-sky-600 hover:underline">
                    إضافة عميل جديد
                  </Link>
                </p>
              ) : (
                <Select name="customerId" required defaultValue={trip.customerId}>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <ProgramDatesFields
              programs={programs.map((p) => ({ id: p.id, name: p.name, durationDays: p.durationDays }))}
              initialProgramId={trip.programId}
              initialStart={formatDateForInput(trip.startDate)}
              initialEnd={formatDateForInput(trip.endDate)}
            />

            <Field label="عدد الأشخاص">
              <Input type="number" name="numPax" min={1} defaultValue={trip.numPax} />
            </Field>

            <Field label="السعر الإجمالي المتفق عليه">
              <Input type="number" name="agreedPrice" min={0} step="0.01" defaultValue={trip.agreedPrice} />
            </Field>

            <Field label="العملة">
              <Select name="currency" defaultValue={trip.currency}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="الحالة">
              <Select name="status" defaultValue={trip.status}>
                {TRIP_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {TRIP_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="ملاحظات">
            <Textarea name="notes" rows={3} defaultValue={trip.notes ?? ""} />
          </Field>

          <div>
            <Button type="submit">حفظ التعديلات</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
