import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, EmptyState, LinkButton } from "@/components/ui";
import { ExportButton } from "@/components/ExportButton";
import { DeleteButton } from "@/components/DeleteButton";
import { SearchBox, Pagination, parsePage, PER_PAGE } from "@/components/ListControls";
import { deleteCustomer } from "./actions";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" && sp.q.trim() !== "" ? sp.q.trim() : undefined;
  const page = parsePage(sp.page);
  const where = q ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }] } : {};
  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
    orderBy: { name: "asc" },
    include: { _count: { select: { trips: true } } },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.customer.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        title="العملاء"
        description="قاعدة بيانات عملاء الوكالة وأرقام هواتفهم وبريدهم الإلكتروني"
        action={
          <div className="flex items-center gap-2">
            <ExportButton href="/customers/export" />
            <LinkButton href="/customers/new">+ إضافة عميل</LinkButton>
          </div>
        }
      />

      <SearchBox q={q} basePath="/customers" placeholder="بحث بالاسم أو الهاتف أو البريد..." />

      <Card>
        {customers.length === 0 ? (
          <EmptyState message="لا يوجد عملاء بعد" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>الاسم</Th>
                <Th>رقم الهاتف</Th>
                <Th>البريد الإلكتروني</Th>
                <Th>عدد الرحلات</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <Td className="font-medium text-slate-800">{c.name}</Td>
                  <Td>{c.phone ?? "-"}</Td>
                  <Td>{c.email ?? "-"}</Td>
                  <Td>{c._count.trips}</Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <LinkButton href={`/customers/${c.id}`} variant="secondary">
                        تعديل
                      </LinkButton>
                      <DeleteButton action={deleteCustomer.bind(null, c.id)} />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Pagination page={page} total={total} basePath="/customers" params={{ q }} />
    </div>
  );
}
