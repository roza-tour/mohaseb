import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Field, Input, Textarea, Select, Button, ErrorBanner } from "@/components/ui";
import { createTrip } from "../actions";
import { TRIP_STATUSES, TRIP_STATUS_LABELS, CURRENCIES } from "../statusLabels";
import { ProgramDatesFields } from "../ProgramDatesFields";

export default async function NewTripPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const [customers, programs] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.tourProgram.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="رحلة جديدة" description="إنشاء رحلة فعلية جديدة لعميل" />

      <ErrorBanner message={sp.error} />

      {(customers.length === 0 || programs.length === 0) && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          لإنشاء رحلة تحتاج أولاً إلى{" "}
          {customers.length === 0 && (
            <Link href="/customers/new" className="font-medium underline">
              إضافة عميل
            </Link>
          )}
          {customers.length === 0 && programs.length === 0 && " و"}
          {programs.length === 0 && (
            <Link href="/programs/new" className="font-medium underline">
              إضافة برنامج سياحي نشط
            </Link>
          )}
          .
        </div>
      )}

      <Card className="p-5">
        <form action={createTrip} className="space-y-4">
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
                <Select name="customerId" required defaultValue="">
                  <option value="" disabled>
                    اختر عميلاً
                  </option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            {programs.length === 0 ? (
              <Field label="البرنامج السياحي">
                <p className="text-xs text-slate-500">
                  لا توجد برامج نشطة بعد.{" "}
                  <Link href="/programs/new" className="text-sky-600 hover:underline">
                    إضافة برنامج جديد
                  </Link>
                </p>
              </Field>
            ) : (
              <ProgramDatesFields
                programs={programs.map((p) => ({ id: p.id, name: p.name, durationDays: p.durationDays }))}
              />
            )}

            <Field label="عدد الأشخاص">
              <Input type="number" name="numPax" min={1} defaultValue={1} />
            </Field>

            <Field label="السعر الإجمالي المتفق عليه">
              <Input type="number" name="agreedPrice" min={0} step="0.01" defaultValue={0} />
            </Field>

            <Field label="العملة">
              <Select name="currency" defaultValue="DZD">
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="الحالة">
              <Select name="status" defaultValue="PLANNED">
                {TRIP_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {TRIP_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="ملاحظات">
            <Textarea name="notes" rows={3} />
          </Field>

          <div>
            <Button type="submit" disabled={customers.length === 0 || programs.length === 0}>
              حفظ
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
