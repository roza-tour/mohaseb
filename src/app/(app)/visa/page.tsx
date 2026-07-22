import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, EmptyState, LinkButton, Badge } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { SearchBox, Pagination, parsePage, PER_PAGE } from "@/components/ListControls";
import { formatDate } from "@/lib/format";
import { deleteVisaApplication, duplicateVisaApplication } from "./actions";

export default async function VisaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" && sp.q.trim() !== "" ? sp.q.trim() : undefined;
  const page = parsePage(sp.page);
  const justCreated = typeof sp.created === "string" ? sp.created : undefined;

  const where = q
    ? {
        OR: [
          { refNumber: { contains: q } },
          { wilaya: { contains: q } },
          { travelers: { some: { OR: [{ nom: { contains: q } }, { numeroPasseport: { contains: q } }] } } },
        ],
      }
    : {};

  const [apps, total] = await Promise.all([
    prisma.visaApplication.findMany({
      where,
      include: { travelers: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.visaApplication.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        title="الفيزا الصحراوية"
        description="أنشئ طلب الفيزا مرة واحدة، وحمّل الملفين الرسميين (قائمة طالبي الفيزا Excel والبرنامج المفصل Word) معبأين تلقائياً"
        action={<LinkButton href="/visa/new">+ إنشاء فيزا</LinkButton>}
      />

      {justCreated && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✅ تم إنشاء الطلب — حمّل الملفين من الأزرار في الجدول أدناه
        </div>
      )}

      <SearchBox q={q} basePath="/visa" placeholder="بحث بالرقم أو الولاية أو اسم مسافر أو رقم جواز..." />

      <Card>
        {apps.length === 0 ? (
          <EmptyState message="لا توجد طلبات فيزا بعد" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>الرقم</Th>
                <Th>الولاية</Th>
                <Th>الوصول → المغادرة</Th>
                <Th>المسافرون</Th>
                <Th>الملفان الرسميان</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id} className={a.id === justCreated ? "bg-emerald-50" : ""}>
                  <Td className="font-mono text-xs">{a.refNumber}</Td>
                  <Td className="font-medium text-slate-800">{a.wilaya}</Td>
                  <Td>
                    {formatDate(a.arrivalDate)} ← {formatDate(a.departureDate)}
                  </Td>
                  <Td>
                    <Badge color="sky">{a.travelers.length} مسافر</Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Link href={`/visa/${a.id}/excel`} className="text-emerald-700 text-sm hover:underline">
                        📊 قائمة Excel
                      </Link>
                      <Link href={`/visa/${a.id}/word`} className="text-sky-700 text-sm hover:underline">
                        📄 برنامج Word (مختوم)
                      </Link>
                      <form action={duplicateVisaApplication.bind(null, a.id)}>
                        <button type="submit" className="text-slate-500 text-sm hover:underline whitespace-nowrap">⧉ نسخة</button>
                      </form>
                    </div>
                  </Td>
                  <Td>
                    <DeleteButton action={deleteVisaApplication.bind(null, a.id)} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Pagination page={page} total={total} basePath="/visa" params={{ q }} />
    </div>
  );
}
