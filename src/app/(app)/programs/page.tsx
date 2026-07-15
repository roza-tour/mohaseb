import { prisma } from "@/lib/prisma";
import { PageHeader, Card, LinkButton, Table, Th, Td, EmptyState, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteProgram } from "./actions";

export default async function ProgramsPage() {
  const programs = await prisma.tourProgram.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <PageHeader
        title="البرامج السياحية"
        description="إدارة قوالب البرامج السياحية ومكوّنات التكلفة التقديرية"
        action={<LinkButton href="/programs/new">+ إضافة</LinkButton>}
      />

      <Card>
        {programs.length === 0 ? (
          <EmptyState message="لا توجد برامج سياحية بعد" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>الاسم</Th>
                <Th>المدة</Th>
                <Th>السعر المعروض</Th>
                <Th>التكلفة التقديرية</Th>
                <Th>الحالة</Th>
                <Th>إجراءات</Th>
              </tr>
            </thead>
            <tbody>
              {programs.map((p) => {
                const estimatedCost =
                  p.estHotelCostPerNight * (p.durationDays - 1) +
                  p.estTransportCost +
                  p.estGuideFee +
                  p.estOtherCosts;
                return (
                  <tr key={p.id}>
                    <Td>{p.name}</Td>
                    <Td>{p.durationDays} أيام</Td>
                    <Td>{formatCurrency(p.standardPrice, p.currency)}</Td>
                    <Td>{formatCurrency(estimatedCost, p.currency)}</Td>
                    <Td>
                      {p.isActive ? <Badge color="green">نشط</Badge> : <Badge color="slate">غير نشط</Badge>}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-3">
                        <LinkButton href={`/programs/${p.id}`} variant="secondary">
                          تعديل
                        </LinkButton>
                        <DeleteButton action={deleteProgram.bind(null, p.id)} />
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
