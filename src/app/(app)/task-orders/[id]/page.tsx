import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, ErrorBanner } from "@/components/ui";
import { formatDateForInput } from "@/lib/format";
import { updateTaskOrder } from "../actions";
import { TaskOrderForm } from "../TaskOrderForm";

export default async function EditTaskOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const [order, trips, guides, drivers] = await Promise.all([
    prisma.taskOrder.findUnique({ where: { id } }),
    prisma.trip.findMany({ include: { program: true, customer: true }, orderBy: { startDate: "desc" } }),
    prisma.guide.findMany({ orderBy: { name: "asc" } }),
    prisma.driver.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!order) notFound();

  return (
    <div>
      <PageHeader
        title="تعديل أمر التكليف"
        description="عدّل بيانات المهمة ثم احفظ — وأعِد تنزيل الـ PDF بعد الحفظ"
        action={
          <Link
            href={`/task-orders/${order.id}/pdf`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            📑 عرض الـ PDF
          </Link>
        }
      />

      <ErrorBanner message={sp.error} />

      <TaskOrderForm
        action={updateTaskOrder.bind(null, id)}
        trips={trips}
        guides={guides}
        drivers={drivers}
        submitLabel="حفظ التعديلات"
        initial={{
          tripId: order.tripId,
          // نعتمد الصفة المخزَّنة لا وجود المرشد، حتى لا تنقلب صفة الأمر
          // إلى "سائق" لو حُذف المرشد المكلَّف من قاعدة البيانات
          assigneeType: order.assigneeType === "DRIVER" ? "DRIVER" : "GUIDE",
          guideId: order.guideId ?? "",
          driverId: order.driverId ?? "",
          taskDate: formatDateForInput(order.taskDate),
          details: order.details ?? "",
        }}
      />
    </div>
  );
}
