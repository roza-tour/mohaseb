import Link from "@/components/AppLink";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, EmptyState, LinkButton, Badge, SuccessBanner } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { PdfLangLinks } from "@/components/PdfLangLinks";
import { Pagination, parsePage, PER_PAGE } from "@/components/ListControls";
import { formatDate } from "@/lib/format";
import { findTaskOrders, taskOrderTripLabel } from "@/lib/taskOrderView";
import { deleteTaskOrder } from "./actions";

export default async function TaskOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  // أوامر المرشدين وأوامر السائقين منفصلة: تبويب لكل صفة
  const type = sp.type === "DRIVER" ? "DRIVER" : sp.type === "GUIDE" ? "GUIDE" : null;
  const where = type ? { assigneeType: type } : {};
  // قراءة لا تنكسر: أمر تكليف يشير إلى رحلة محذوفة كان يُسقط الصفحة كلها بخطأ خادم
  const [taskOrders, total] = await Promise.all([
    findTaskOrders({
      where,
      orderBy: { taskDate: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.taskOrder.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        title="أوامر التكليف بمهمة"
        description="إصدار أوامر تكليف للمرشدين والسائقين بصيغة PDF جاهزة للطباعة"
        action={
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/task-orders/new?type=GUIDE">+ أمر تكليف مرشد</LinkButton>
            <LinkButton href="/task-orders/new?type=DRIVER">+ أمر تكليف سائق</LinkButton>
          </div>
        }
      />

      <div className="mb-4 flex gap-2 text-sm">
        {[
          { key: null, label: "الكل" },
          { key: "GUIDE", label: "🧭 أوامر المرشدين" },
          { key: "DRIVER", label: "🚐 أوامر السائقين" },
        ].map((tab) => (
          <Link
            key={tab.label}
            href={tab.key ? `/task-orders?type=${tab.key}` : "/task-orders"}
            className={`rounded-full px-4 py-1.5 border transition ${
              type === tab.key
                ? "bg-sky-600 text-white border-sky-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

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
                    {taskOrderTripLabel(to).deleted ? (
                      <span className="text-red-600" title="الرحلة المرتبطة غير موجودة في قاعدة البيانات">
                        ⚠️ رحلة محذوفة — عدّل الأمر أو احذفه
                      </span>
                    ) : (
                      taskOrderTripLabel(to).text
                    )}
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

      <Pagination page={page} total={total} basePath="/task-orders" params={{ type: type ?? undefined }} />
    </div>
  );
}
