import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, EmptyState, LinkButton } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteGuide } from "./actions";

export default async function GuidesPage() {
  const guides = await prisma.guide.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <PageHeader
        title="المرشدون السياحيون"
        description="قاعدة بيانات المرشدين السياحيين واللغات التي يتقنونها وبيانات التواصل"
        action={<LinkButton href="/guides/new">+ إضافة مرشد</LinkButton>}
      />

      <Card>
        {guides.length === 0 ? (
          <EmptyState message="لا يوجد مرشدون بعد" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>الاسم</Th>
                <Th>اللغات</Th>
                <Th>رقم الهاتف</Th>
                <Th>البريد الإلكتروني</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody>
              {guides.map((g) => (
                <tr key={g.id}>
                  <Td className="font-medium text-slate-800">{g.name}</Td>
                  <Td>{g.languages ?? "-"}</Td>
                  <Td>{g.phone ?? "-"}</Td>
                  <Td>{g.email ?? "-"}</Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <LinkButton href={`/guides/${g.id}`} variant="secondary">
                        تعديل
                      </LinkButton>
                      <DeleteButton action={deleteGuide.bind(null, g.id)} />
                    </div>
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
