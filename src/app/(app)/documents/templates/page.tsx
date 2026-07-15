import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, EmptyState, LinkButton } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteTemplate } from "../actions";

export default async function TemplatesPage() {
  const templates = await prisma.documentTemplate.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <PageHeader
        title="قوالب المستندات"
        description="أنشئ وعدّل قوالبك بنفسك — دعوة سياحية، تصريح عمل، أو أي نموذج تحتاجه، دون الارتباط بقالب محدد"
        action={
          <div className="flex gap-2">
            <LinkButton href="/documents" variant="secondary">
              المستندات الصادرة
            </LinkButton>
            <LinkButton href="/documents/templates/new">+ قالب جديد</LinkButton>
          </div>
        }
      />

      <Card>
        {templates.length === 0 ? (
          <EmptyState message="لا توجد قوالب بعد — أنشئ قالبك الأول" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>اسم القالب</Th>
                <Th>عنوان المستند</Th>
                <Th></Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <Td className="font-medium text-slate-800">{t.name}</Td>
                  <Td>{t.title}</Td>
                  <Td>
                    <LinkButton href={`/documents/templates/${t.id}`} variant="secondary">
                      تعديل
                    </LinkButton>
                  </Td>
                  <Td>
                    <DeleteButton action={deleteTemplate.bind(null, t.id)} />
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
