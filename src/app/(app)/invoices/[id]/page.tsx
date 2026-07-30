import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, ErrorBanner } from "@/components/ui";
import { formatDateForInput } from "@/lib/format";
import { updateInvoice, type InvoiceItem } from "../actions";
import { InvoiceForm } from "../InvoiceForm";

export default async function EditInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const [invoice, trips, customers] = await Promise.all([
    prisma.invoice.findUnique({ where: { id } }),
    prisma.trip.findMany({ include: { program: true, customer: true }, orderBy: { startDate: "desc" } }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!invoice) notFound();

  const items = Array.isArray(invoice.items) ? (invoice.items as InvoiceItem[]) : [];

  return (
    <div>
      <PageHeader
        title={`تعديل الفاتورة ${invoice.invoiceNumber}`}
        description="عدّل البنود أو البيانات ثم احفظ — رقم الفاتورة لا يتغيّر، وأعِد تنزيل الـ PDF بعد الحفظ"
        action={
          <Link
            href={`/invoices/${invoice.id}/pdf`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            📑 عرض الـ PDF
          </Link>
        }
      />

      <ErrorBanner message={sp.error} />

      <InvoiceForm
        action={updateInvoice.bind(null, id)}
        trips={trips}
        customers={customers}
        submitLabel="حفظ التعديلات"
        initial={{
          tripId: invoice.tripId ?? "",
          customerId: invoice.customerId ?? "",
          docDate: formatDateForInput(invoice.docDate),
          currency: invoice.currency,
          items: items.map((it) => ({
            description: it.description,
            qty: String(it.qty),
            unitPrice: String(it.unitPrice),
          })),
          discount: invoice.discount,
          notes: invoice.notes ?? "",
          showStamp: invoice.showStamp,
        }}
      />
    </div>
  );
}
