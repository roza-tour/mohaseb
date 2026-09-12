import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, EmptyState, LinkButton, Badge, SuccessBanner } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { PdfLangLinks } from "@/components/PdfLangLinks";
import { Pagination, parsePage, PER_PAGE } from "@/components/ListControls";
import { formatDate } from "@/lib/format";
import { deleteTaskOrder } from "./actions";

export default async function TaskOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const [taskOrders, total] = await Promise.all([
    prisma.taskOrder.findMany({
      include: { trip: { include: { program: true, customer: true } }, guide: true, driver: true },
      orderBy: { taskDate: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.taskOrder.count(),
  ]);

  return (
    <div>
      <PageHeader
        title="أوامر التكليف بمهمة"
        description="إصدار أوامر تكليف للمرشدين والسائقين بصيغة PDF جاهزة للطباعة"
        action={<LinkButton href="/task-orders/new">+ أمر تكليف جديد</LinkButton>}
      />

      {sp.updated && <SuccessBanner message="تم حفظ تعديلات أمر التكليف — أعِد تنزيل الـ PDF ليظهر بالبيانات الجديدة" />}

      <Card>
        {taskOrders.length === 0 ? (
          <EmptyState message="لا توجد أوامر تكليف بعد" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>الرحلة</Th>
                <Th>المكلَّف</Th>
                <Th>الصفة</Th>
                <Th>تاريخ المهمة</Th>
                <Th></Th>
                <Th></Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {taskOrders.map((to) => (
                <tr key={to.id}>
                  <Td>
                    {to.trip.program.name} — {to.trip.customer.name}
                  </Td>
                  <Td className="font-medium text-slate-800">
                    {to.guide?.name ??
                      to.driver?.name ?? (
                        // المكلَّف حُذف من قاعدة البيانات بعد إصدار الأمر
                        <span className="text-red-600" title="المكلَّف محذوف من قاعدة البيانات">
                          ⚠️ مكلَّف محذوف — عدّل الأمر
                        </span>
                      )}
                  </Td>
                  <Td>
                    <Badge color={to.assigneeType === "GUIDE" ? "sky" : "amber"}>
                      {to.assigneeType === "GUIDE" ? "مرشد سياحي" : "سائق"}
                    </Badge>
                  </Td>
                  <Td>{formatDate(to.taskDate)}</Td>
                  <Td>
                    <PdfLangLinks base={`/task-orders/${to.id}/pdf`} label="أمر التكليف" />
                  </Td>
                  <Td>
                    <Link href={`/task-orders/${to.id}`} className="text-sky-600 text-sm hover:underline whitespace-nowrap">
                      ✎ تعديل
                    </Link>
                  </Td>
                  <Td>
                    <DeleteButton action={deleteTaskOrder.bind(null, to.id)} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Pagination page={page} total={total} basePath="/task-orders" />
    </div>
  );
}
