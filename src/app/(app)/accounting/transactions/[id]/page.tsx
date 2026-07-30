import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, ErrorBanner } from "@/components/ui";
import { formatDateForInput } from "@/lib/format";
import { updateTransaction } from "../actions";
import { TransactionForm } from "../TransactionForm";

export default async function EditTransactionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const [tx, trips] = await Promise.all([
    prisma.transaction.findUnique({ where: { id } }),
    prisma.trip.findMany({ include: { program: true, customer: true }, orderBy: { startDate: "desc" } }),
  ]);
  if (!tx) notFound();

  // القيود المولَّدة من دعوة أو فيزا تُعرض للقراءة فقط
  const linked = Boolean(tx.invitationId || tx.visaApplicationId);
  const linkedHref = tx.invitationId ? `/invitations/${tx.invitationId}` : tx.visaApplicationId ? `/visa/${tx.visaApplicationId}` : null;

  return (
    <div>
      <PageHeader
        title={linked ? "قيد مرتبط بمستند" : "تعديل القيد المحاسبي"}
        description={
          linked
            ? "هذا القيد أُنشئ تلقائياً مع مستند — عدّل المستند نفسه ليتحدَّث القيد معه"
            : "عدّل بيانات القيد ثم احفظ"
        }
      />

      <ErrorBanner message={sp.error} />

      {linked && linkedHref && (
        <div className="mb-4 max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          لتعديل هذا القيد،{" "}
          <a href={linkedHref} className="font-medium underline">
            افتح المستند المرتبط به
          </a>{" "}
          وعدّل الرسم هناك — سيتحدَّث القيد تلقائياً.
        </div>
      )}

      <TransactionForm
        action={updateTransaction.bind(null, id)}
        trips={trips}
        locked={linked}
        submitLabel="حفظ التعديلات"
        initial={{
          type: tx.type,
          category: tx.category,
          amount: String(tx.amount),
          currency: tx.currency,
          date: formatDateForInput(tx.date),
          tripId: tx.tripId ?? "",
          description: tx.description ?? "",
        }}
      />
    </div>
  );
}
