import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, EmptyState, LinkButton } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { SearchBox, Pagination, parsePage, PER_PAGE } from "@/components/ListControls";
import { deleteHotel } from "./actions";

export default async function HotelsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" && sp.q.trim() !== "" ? sp.q.trim() : undefined;
  const page = parsePage(sp.page);
  const where = q ? { OR: [{ name: { contains: q } }, { city: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }] } : {};
  const [hotels, total] = await Promise.all([
    prisma.hotel.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.hotel.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        title="الفنادق"
        description="قاعدة بيانات الفنادق المتعامل معها وبيانات التواصل الخاصة بها"
        action={<LinkButton href="/hotels/new">+ إضافة فندق</LinkButton>}
      />

      <SearchBox q={q} basePath="/hotels" placeholder="بحث بالاسم أو المدينة..." />

      <Card>
        {hotels.length === 0 ? (
          <EmptyState message="لا توجد فنادق بعد" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>الاسم</Th>
                <Th>المدينة</Th>
                <Th>الشخص المسؤول</Th>
                <Th>رقم الهاتف</Th>
                <Th>البريد الإلكتروني</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody>
              {hotels.map((h) => (
                <tr key={h.id}>
                  <Td className="font-medium text-slate-800">{h.name}</Td>
                  <Td>{h.city ?? "-"}</Td>
                  <Td>{h.contactPerson ?? "-"}</Td>
                  <Td>{h.phone ?? "-"}</Td>
                  <Td>{h.email ?? "-"}</Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <LinkButton href={`/hotels/${h.id}`} variant="secondary">
                        تعديل
                      </LinkButton>
                      <DeleteButton action={deleteHotel.bind(null, h.id)} />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Pagination page={page} total={total} basePath="/hotels" params={{ q }} />
    </div>
  );
}
