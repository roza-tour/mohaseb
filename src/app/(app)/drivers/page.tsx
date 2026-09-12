import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, EmptyState, LinkButton, ErrorBanner } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { SearchBox, Pagination, parsePage, PER_PAGE } from "@/components/ListControls";
import { deleteDriver } from "./actions";

export default async function DriversPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" && sp.q.trim() !== "" ? sp.q.trim() : undefined;
  const page = parsePage(sp.page);
  const where = q ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }, { vehicleInfo: { contains: q } }] } : {};
  const [drivers, total] = await Promise.all([
    prisma.driver.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.driver.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        title="السائقون"
        description="قاعدة بيانات السائقين ومركباتهم وبيانات التواصل الخاصة بهم"
        action={<LinkButton href="/drivers/new">+ إضافة سائق</LinkButton>}
      />

      <ErrorBanner message={sp.error} />

      <SearchBox q={q} basePath="/drivers" placeholder="بحث بالاسم أو الهاتف أو المركبة..." />

      <Card>
        {drivers.length === 0 ? (
          <EmptyState message="لا يوجد سائقون بعد" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>الاسم</Th>
                <Th>بيانات المركبة</Th>
                <Th>رقم الهاتف</Th>
                <Th>البريد الإلكتروني</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id}>
                  <Td className="font-medium text-slate-800">{d.name}</Td>
                  <Td>{d.vehicleInfo ?? "-"}</Td>
                  <Td>{d.phone ?? "-"}</Td>
                  <Td>{d.email ?? "-"}</Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <LinkButton href={`/drivers/${d.id}`} variant="secondary">
                        تعديل
                      </LinkButton>
                      <DeleteButton action={deleteDriver.bind(null, d.id)} />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Pagination page={page} total={total} basePath="/drivers" params={{ q }} />
    </div>
  );
}
