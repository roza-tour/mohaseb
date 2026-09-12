import { prisma } from "@/lib/prisma";
import { PageHeader, Card, LinkButton, Table, Th, Td, EmptyState, Badge, ErrorBanner } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteProgram } from "./actions";

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const imported = typeof sp.imported === "string" ? sp.imported : undefined;
  const skipped = typeof sp.skipped === "string" ? sp.skipped : undefined;
  const programs = await prisma.tourProgram.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <PageHeader
        title="البرامج السياحية"
        description="إدارة قوالب البرامج السياحية ومكوّنات التكلفة التقديرية"
        action={
          <div className="flex items-center gap-2">
            <LinkButton href="/programs/import" variant="secondary">
              🌐 استيراد من الموقع
            </LinkButton>
            <LinkButton href="/programs/new">+ إضافة</LinkButton>
          </div>
        }
      />

      <ErrorBanner message={sp.error} />

      {imported !== undefined && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✅ تم استيراد {imported} برنامجاً
          {skipped && skipped !== "0" ? ` — وتم تخطي ${skipped} موجود مسبقاً بنفس الاسم` : ""}
        </div>
      )}

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
