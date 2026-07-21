import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Field, Select, Input, Button, LinkButton, ErrorBanner } from "@/components/ui";
import { formatDate, formatDateForInput } from "@/lib/format";
import { createInvoice } from "../actions";
import { ItemsEditor } from "../ItemsEditor";

const CURRENCIES = ["DZD", "EUR", "USD", "TND", "MAD", "SAR"];

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const tripId = typeof sp.tripId === "string" ? sp.tripId : "";

  const [trips, customers, settings] = await Promise.all([
    prisma.trip.findMany({
      include: { program: true, customer: true },
      orderBy: { startDate: "desc" },
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);

  const trip = tripId ? trips.find((t) => t.id === tripId) : null;
  const defaultCurrency = trip?.currency ?? settings?.defaultCurrency ?? "DZD";

  return (
    <div>
      <PageHeader title="فاتورة جديدة" description="فاتورة رسمية ببنود ومبالغ تُصدر بصيغة PDF على ورق الشركة" />

      <ErrorBanner message={sp.error} />

      <Card className="p-5 max-w-3xl">
        <form action={createInvoice} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="الرحلة (اختياري)">
              <Select name="tripId" defaultValue={tripId}>
                <option value="">بدون ربط برحلة</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.program.name} — {t.customer.name} — {formatDate(t.startDate)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="العميل">
              <Select name="customerId" defaultValue={trip?.customerId ?? ""}>
                <option value="">بدون عميل</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="تاريخ الفاتورة">
              <Input type="date" name="docDate" defaultValue={formatDateForInput(new Date())} />
            </Field>
            <Field label="العملة">
              <Select name="currency" defaultValue={defaultCurrency}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="بنود الفاتورة">
            <ItemsEditor currency={defaultCurrency} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="الخصم (اختياري)">
              <Input type="number" name="discount" min={0} step="0.01" defaultValue={0} />
            </Field>
            <Field label="ملاحظات تظهر أسفل الفاتورة (اختياري)">
              <Input name="notes" placeholder="مثال: تُدفع خلال 7 أيام من تاريخ الإصدار" />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="showStamp" defaultChecked />
            إظهار خانتي الختم والتوقيع أسفل الفاتورة
          </label>

          <div className="flex items-center gap-2">
            <Button type="submit">إصدار الفاتورة (PDF)</Button>
            <LinkButton href="/invoices" variant="secondary">
              إلغاء
            </LinkButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
