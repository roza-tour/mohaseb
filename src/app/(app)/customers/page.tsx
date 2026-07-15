import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, EmptyState, LinkButton } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteCustomer } from "./actions";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { trips: true } } },
  });

  return (
    <div>
      <PageHeader
        title="العملاء"
        description="قاعدة بيانات عملاء الوكالة وأرقام هواتفهم وبريدهم الإلكتروني"
        action={<LinkButton href="/customers/new">+ إضافة عميل</LinkButton>}
      />

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
    </div>
  );
}
