import Link from "@/components/AppLink";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, EmptyState, LinkButton } from "@/components/ui";
import { SearchBox, Pagination, parsePage, PER_PAGE } from "@/components/ListControls";
import { formatDate } from "@/lib/format";

// غادر الموظف إن كان تاريخ نهاية عمله قد مضى
function hasLeft(end: Date | null): boolean {
  return !!end && end.getTime() <= Date.now();
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" && sp.q.trim() !== "" ? sp.q.trim() : undefined;
  const page = parsePage(sp.page);
  const where = q ? { OR: [{ name: { contains: q } }, { jobTitle: { contains: q } }] } : {};
  const [employees, total] = await Promise.all([
    prisma.employee.findMany({ where, orderBy: { name: "asc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.employee.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        title="الموظفون"
        description="موظفو الوكالة — ومنها تُصدر شهادات العمل"
        action={<LinkButton href="/employees/new">+ إضافة موظف</LinkButton>}
      />

      <SearchBox q={q} basePath="/employees" placeholder="بحث بالاسم أو الوظيفة..." />

      <Card>
        {employees.length === 0 ? (
          <EmptyState message="لا يوجد موظفون بعد" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>الاسم</Th>
                <Th>الوظيفة</Th>
                <Th>بداية العمل</Th>
                <Th>الحالة</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id}>
                  <Td className="font-medium text-slate-800">
                    <Link href={`/employees/${e.id}`} className="hover:underline">
                      {e.name || "بلا اسم"}
                    </Link>
                  </Td>
                  <Td>{e.jobTitle ?? "-"}</Td>
                  <Td>{e.startDate ? formatDate(e.startDate) : "-"}</Td>
                  <Td>{hasLeft(e.endDate) ? "غادر" : "يعمل"}</Td>
                  <Td>
                    <Link
                      href={`/employees/${e.id}#certificate`}
                      className="text-sky-600 text-sm hover:underline whitespace-nowrap"
                    >
                      📜 شهادة عمل
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Pagination page={page} total={total} basePath="/employees" params={{ q }} />
    </div>
  );
}
