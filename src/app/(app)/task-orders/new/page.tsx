import Link from "@/components/AppLink";
import { prisma } from "@/lib/prisma";
import { findTripsWithNames } from "@/lib/safeRead";
import { PageHeader, ErrorBanner, Card } from "@/components/ui";
import { createTaskOrder } from "../actions";
import { TaskOrderForm } from "../TaskOrderForm";

export default async function NewTaskOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const tripId = typeof sp.tripId === "string" ? sp.tripId : "";
  const type = sp.type === "DRIVER" ? "DRIVER" : sp.type === "GUIDE" ? "GUIDE" : null;

  // أمر المرشد وأمر السائق منفصلان: نسأل أولاً أيّهما
  if (!type) {
    const q = tripId ? `&tripId=${encodeURIComponent(tripId)}` : "";
    return (
      <div>
        <PageHeader title="أمر تكليف جديد" description="اختر نوع الأمر" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          <Link href={`/task-orders/new?type=GUIDE${q}`}>
            <Card className="p-6 text-center hover:border-sky-400 transition">
              <div className="text-3xl mb-2">🧭</div>
              <div className="font-semibold text-slate-800">أمر تكليف مرشد سياحي</div>
            </Card>
          </Link>
          <Link href={`/task-orders/new?type=DRIVER${q}`}>
            <Card className="p-6 text-center hover:border-amber-400 transition">
              <div className="text-3xl mb-2">🚐</div>
              <div className="font-semibold text-slate-800">أمر تكليف سائق</div>
            </Card>
          </Link>
        </div>
      </div>
    );
  }

  const isDriver = type === "DRIVER";
  const [trips, people] = await Promise.all([
    findTripsWithNames({ orderBy: { startDate: "desc" } }),
    isDriver
      ? prisma.driver.findMany({ orderBy: { name: "asc" } })
      : prisma.guide.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title={isDriver ? "أمر تكليف سائق جديد" : "أمر تكليف مرشد سياحي جديد"}
        description="اختر رحلة مسجّلة، أو أدخل الرحلة واسم المسافر وجنسيته يدوياً"
      />

      <ErrorBanner message={sp.error} />

      {people.length === 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 max-w-2xl">
          {isDriver
            ? "لا يوجد سائقون مسجَّلون — أضف سائقاً أولاً من صفحة السائقين."
            : "لا يوجد مرشدون مسجَّلون — أضف مرشداً أولاً من صفحة المرشدين."}
        </div>
      )}

      <TaskOrderForm
        action={createTaskOrder}
        trips={trips}
        guides={isDriver ? [] : people}
        drivers={isDriver ? people : []}
        initial={{
          tripId,
          assigneeType: type,
          guideId: "",
          driverId: "",
          taskDate: "",
          details: "",
          fields: {},
          extraRows: [],
        }}
      />
    </div>
  );
}
