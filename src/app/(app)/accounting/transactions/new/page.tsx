import { prisma } from "@/lib/prisma";
import { PageHeader, ErrorBanner } from "@/components/ui";
import { createTransaction } from "../actions";
import { TransactionForm } from "../TransactionForm";

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const trips = await prisma.trip.findMany({
    include: { program: true, customer: true },
    orderBy: { startDate: "desc" },
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader title="قيد محاسبي جديد" description="إضافة إيراد أو مصروف جديد" />

      <ErrorBanner message={sp.error} />

      <TransactionForm
        action={createTransaction}
        trips={trips}
        initial={{
          type: "INCOME",
          category: "",
          amount: "",
          currency: "DZD",
          date: today,
          tripId: "",
          description: "",
        }}
      />
    </div>
  );
}
