import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, EmptyState, LinkButton } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteDriver } from "./actions";

export default async function DriversPage() {
  const drivers = await prisma.driver.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <PageHeader
        title="السائقون"
        description="قاعدة بيانات السائقين ومركباتهم وبيانات التواصل الخاصة بهم"
        action={<LinkButton href="/drivers/new">+ إضافة سائق</LinkButton>}
      />

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
    </div>
  );
}
