import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, EmptyState, LinkButton } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteHotel } from "./actions";

export default async function HotelsPage() {
  const hotels = await prisma.hotel.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <PageHeader
        title="الفنادق"
        description="قاعدة بيانات الفنادق المتعامل معها وبيانات التواصل الخاصة بها"
        action={<LinkButton href="/hotels/new">+ إضافة فندق</LinkButton>}
      />

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
    </div>
  );
}
