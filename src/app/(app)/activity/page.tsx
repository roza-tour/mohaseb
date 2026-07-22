import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, EmptyState, Badge } from "@/components/ui";

const ACTION_LABEL: Record<string, { label: string; color: "green" | "red" | "sky" | "amber" | "slate" }> = {
  create: { label: "إنشاء", color: "green" },
  delete: { label: "حذف", color: "red" },
  duplicate: { label: "نسخة", color: "sky" },
  pay: { label: "حالة دفع", color: "amber" },
  send: { label: "إرسال", color: "sky" },
  update: { label: "تعديل", color: "slate" },
};

const ENTITY_LABEL: Record<string, string> = {
  Invoice: "فاتورة",
  Invitation: "دعوة",
  Visa: "فيزا",
  Customer: "عميل",
  Offer: "عرض",
  Trip: "رحلة",
};

function fmtDateTime(d: Date) {
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day}/${month}/${d.getUTCFullYear()} ${hh}:${mm}`;
}

export default async function ActivityPage() {
  const logs = await prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div>
      <PageHeader title="سجل النشاط" description="من قام بأي إجراء ومتى — آخر 200 عملية" />
      <Card>
        {logs.length === 0 ? (
          <EmptyState message="لا يوجد نشاط مسجّل بعد" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>التاريخ والوقت</Th>
                <Th>الإجراء</Th>
                <Th>النوع</Th>
                <Th>التفاصيل</Th>
                <Th>المستخدم</Th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => {
                const a = ACTION_LABEL[l.action] ?? { label: l.action, color: "slate" as const };
                return (
                  <tr key={l.id}>
                    <Td className="whitespace-nowrap text-xs text-slate-500">{fmtDateTime(l.createdAt)}</Td>
                    <Td>
                      <Badge color={a.color}>{a.label}</Badge>
                    </Td>
                    <Td>{ENTITY_LABEL[l.entity] ?? l.entity}</Td>
                    <Td>{l.summary || "—"}</Td>
                    <Td className="text-xs text-slate-500">{l.userEmail || "—"}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
