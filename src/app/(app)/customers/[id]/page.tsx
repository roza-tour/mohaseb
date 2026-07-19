import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  PageHeader,
  Card,
  Field,
  Input,
  Textarea,
  LinkButton,
  Button,
  Table,
  Th,
  Td,
  EmptyState,
  Badge,
} from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { formatDate, formatCurrency } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS, TripStatus } from "../../trips/statusLabels";
import { updateCustomer, deleteCustomer } from "../actions";

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      trips: {
        include: { program: true, payments: true },
        orderBy: { startDate: "desc" },
      },
      documents: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!customer) notFound();

  // إجماليات العميل مفصولة حسب العملة
  const totals = new Map<string, { agreed: number; paid: number }>();
  for (const t of customer.trips) {
    if (t.status === "CANCELLED") continue;
    const acc = totals.get(t.currency) ?? { agreed: 0, paid: 0 };
    acc.agreed += t.agreedPrice;
    acc.paid += t.payments.reduce((s, p) => s + p.amount, 0);
    totals.set(t.currency, acc);
  }

  const wa = waLink(customer.phone, `مرحباً ${customer.name}،`);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`ملف العميل: ${customer.name}`}
        description={[customer.phone, customer.email].filter(Boolean).join(" — ") || undefined}
        action={
          wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition"
            >
              💬 مراسلة واتساب
            </a>
          ) : undefined
        }
      />

      {/* إجماليات العميل */}
      {totals.size > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...totals.entries()].map(([currency, t]) => (
            <Card key={currency} className="p-5 sm:col-span-3">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500 mb-1">إجمالي التعاملات ({currency})</p>
                  <p className="font-bold text-slate-800">{formatCurrency(t.agreed, currency)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">إجمالي المدفوع</p>
                  <p className="font-bold text-emerald-600">{formatCurrency(t.paid, currency)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">المتبقي</p>
                  <p className={`font-bold ${t.agreed - t.paid > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {formatCurrency(t.agreed - t.paid, currency)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* رحلات العميل */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-800">رحلات العميل ({customer.trips.length})</h2>
          <LinkButton href="/trips/new" variant="secondary">
            + رحلة جديدة
          </LinkButton>
        </div>
        {customer.trips.length === 0 ? (
          <EmptyState message="لا توجد رحلات لهذا العميل بعد" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>البرنامج</Th>
                <Th>التاريخ</Th>
                <Th>الحالة</Th>
                <Th>السعر</Th>
                <Th>المتبقي</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {customer.trips.map((t) => {
                const paid = t.payments.reduce((s, p) => s + p.amount, 0);
                const remaining = t.agreedPrice - paid;
                return (
                  <tr key={t.id}>
                    <Td className="font-medium text-slate-800">{t.program.name}</Td>
                    <Td>
                      {formatDate(t.startDate)} - {formatDate(t.endDate)}
                    </Td>
                    <Td>
                      <Badge color={TRIP_STATUS_COLORS[t.status as TripStatus]}>
                        {TRIP_STATUS_LABELS[t.status as TripStatus] ?? t.status}
                      </Badge>
                    </Td>
                    <Td>{formatCurrency(t.agreedPrice, t.currency)}</Td>
                    <Td>
                      {remaining > 0 ? (
                        <Badge color="amber">{formatCurrency(remaining, t.currency)}</Badge>
                      ) : (
                        <Badge color="green">مسدَّدة</Badge>
                      )}
                    </Td>
                    <Td>
                      <LinkButton href={`/trips/${t.id}`} variant="secondary">
                        عرض
                      </LinkButton>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {/* مستندات العميل */}
      {customer.documents.length > 0 && (
        <Card className="p-5">
          <h2 className="font-bold text-slate-800 mb-4">آخر المستندات الصادرة له</h2>
          <Table>
            <thead>
              <tr>
                <Th>الرقم</Th>
                <Th>العنوان</Th>
                <Th>التاريخ</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {customer.documents.map((d) => (
                <tr key={d.id}>
                  <Td className="font-mono text-xs">{d.docNumber}</Td>
                  <Td>{d.title}</Td>
                  <Td>{formatDate(d.docDate)}</Td>
                  <Td>
                    <Link
                      href={`/documents/${d.id}/pdf`}
                      target="_blank"
                      className="text-sky-600 text-sm hover:underline"
                    >
                      PDF
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {/* تعديل البيانات */}
      <Card className="p-5 max-w-2xl">
        <h2 className="font-bold text-slate-800 mb-4">تعديل بيانات العميل</h2>
        <form action={updateCustomer.bind(null, id)} className="space-y-4">
          <Field label="الاسم">
            <Input name="name" required defaultValue={customer.name} />
          </Field>
          <Field label="رقم الهاتف">
            <Input name="phone" defaultValue={customer.phone ?? ""} />
          </Field>
          <Field label="البريد الإلكتروني">
            <Input name="email" type="email" defaultValue={customer.email ?? ""} />
          </Field>
          <Field label="ملاحظات">
            <Textarea name="notes" rows={3} defaultValue={customer.notes ?? ""} />
          </Field>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit">حفظ التعديلات</Button>
            <LinkButton href="/customers" variant="secondary">
              رجوع
            </LinkButton>
            <div className="flex-1" />
            <DeleteButton action={deleteCustomer.bind(null, id)} />
          </div>
        </form>
      </Card>
    </div>
  );
}
