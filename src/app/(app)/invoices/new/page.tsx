import { prisma } from "@/lib/prisma";
import { PageHeader, ErrorBanner } from "@/components/ui";
import { formatDateForInput } from "@/lib/format";
import { createInvoice } from "../actions";
import { InvoiceForm } from "../InvoiceForm";

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

      <InvoiceForm
        action={createInvoice}
        trips={trips}
        customers={customers}
        initial={{
          tripId,
          customerId: trip?.customerId ?? "",
          docDate: formatDateForInput(new Date()),
          currency: defaultCurrency,
          items: [],
          discount: 0,
          notes: "",
          showStamp: true,
        }}
      />
    </div>
  );
}
