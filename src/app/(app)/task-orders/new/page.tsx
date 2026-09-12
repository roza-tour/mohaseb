import { prisma } from "@/lib/prisma";
import { PageHeader, ErrorBanner } from "@/components/ui";
import { createTaskOrder } from "../actions";
import { TaskOrderForm } from "../TaskOrderForm";

export default async function NewTaskOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const tripId = typeof sp.tripId === "string" ? sp.tripId : "";

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

      <ErrorBanner message={sp.error} />

      {trips.length === 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 max-w-2xl">
          لا توجد رحلات بعد — أمر التكليف يرتبط برحلة. أنشئ رحلة أولاً من صفحة الرحلات.
        </div>
      )}

      {guides.length === 0 && drivers.length === 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 max-w-2xl">
          لا يوجد مرشدون ولا سائقون مسجَّلون — لن تستطيع اختيار مكلَّف بالمهمة. أضف مرشداً من صفحة المرشدين
          أو سائقاً من صفحة السائقين أولاً.
        </div>
      )}

      <TaskOrderForm
        action={createTaskOrder}
        trips={trips}
        guides={guides}
        drivers={drivers}
        initial={{ tripId, assigneeType: "GUIDE", guideId: "", driverId: "", taskDate: "", details: "" }}
      />
    </div>
  );
}
