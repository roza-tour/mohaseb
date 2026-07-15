import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, EmptyState, LinkButton } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { formatDate } from "@/lib/format";
import { deleteDocument } from "./actions";

export default async function DocumentsPage() {
  const documents = await prisma.document.findMany({
    include: { trip: { include: { program: true } }, customer: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="المستندات الصادرة"
        description="دعوات سياحية، تصاريح عمل، تأكيدات حجز، أو أي مستند رسمي آخر بورق الشركة — بنص حر أو من قالب جاهز"
        action={
          <div className="flex gap-2">
            <LinkButton href="/documents/templates" variant="secondary">
              إدارة القوالب
            </LinkButton>
            <LinkButton href="/documents/new">+ مستند جديد</LinkButton>
          </div>
        }
      />

      <Card>
        {documents.length === 0 ? (
          <EmptyState message="لا توجد مستندات صادرة بعد — أنشئ مستنداً جديداً من قالب أو بنص حر" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>الرقم</Th>
                <Th>العنوان</Th>
                <Th>العميل</Th>
                <Th>الرحلة المرتبطة</Th>
                <Th>التاريخ</Th>
                <Th></Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id}>
                  <Td className="font-mono text-xs">{d.docNumber}</Td>
                  <Td className="font-medium text-slate-800">{d.title}</Td>
                  <Td>{d.customer?.name ?? "—"}</Td>
                  <Td>{d.trip ? d.trip.program.name : "—"}</Td>
                  <Td>{formatDate(d.docDate)}</Td>
                  <Td>
                    <Link
                      href={`/documents/${d.id}/pdf`}
                      target="_blank"
                      className="text-sky-600 text-sm hover:underline"
                    >
                      عرض / طباعة PDF
                    </Link>
                  </Td>
                  <Td>
                    <DeleteButton action={deleteDocument.bind(null, d.id)} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
