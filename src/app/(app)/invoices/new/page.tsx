import { prisma } from "@/lib/prisma";
import { findTripsWithNames } from "@/lib/safeRead";
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

  const [trips, customers, settings, branches] = await Promise.all([
    findTripsWithNames({ orderBy: { startDate: "desc" }, }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.settings.findUnique({ where: { id: 1 } }),
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true },
    }),
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
        branches={branches}
        initial={{
          tripId,
          customerId: trip?.customerId ?? "",
          docDate: formatDateForInput(new Date()),
          currency: defaultCurrency,
          items: [],
          discount: 0,
          purchasedItem: "",
          branchId: "",
          bankDetails: "",
          notes: "",
          showStamp: true,
        }}
      />
    </div>
  );
}
