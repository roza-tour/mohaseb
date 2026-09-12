import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, EmptyState, LinkButton, ErrorBanner } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { SearchBox, Pagination, parsePage, PER_PAGE } from "@/components/ListControls";
import { deleteGuide } from "./actions";

export default async function GuidesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" && sp.q.trim() !== "" ? sp.q.trim() : undefined;
  const page = parsePage(sp.page);
  const where = q ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }] } : {};
  const [guides, total] = await Promise.all([
    prisma.guide.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.guide.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        title="المرشدون السياحيون"
        description="قاعدة بيانات المرشدين السياحيين واللغات التي يتقنونها وبيانات التواصل"
        action={<LinkButton href="/guides/new">+ إضافة مرشد</LinkButton>}
      />

      <ErrorBanner message={sp.error} />

      <SearchBox q={q} basePath="/guides" placeholder="بحث بالاسم أو الهاتف..." />

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

      <Pagination page={page} total={total} basePath="/guides" params={{ q }} />
    </div>
  );
}
