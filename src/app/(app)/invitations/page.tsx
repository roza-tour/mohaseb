import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, EmptyState, LinkButton, Badge, SuccessBanner, ErrorBanner } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { EmailDocButton } from "@/components/EmailDocButton";
import { SearchBox, Pagination, parsePage, PER_PAGE } from "@/components/ListControls";
import { formatDate, formatCurrency } from "@/lib/format";
import { deleteInvitation, toggleInvitationPaid, duplicateInvitation, emailInvitation } from "./actions";

const LANG_LABEL: Record<string, string> = { ar: "عربي", fr: "Français", en: "English" };

export default async function InvitationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" && sp.q.trim() !== "" ? sp.q.trim() : undefined;
  const sent = typeof sp.sent === "string" ? sp.sent : undefined;
  const page = parsePage(sp.page);
  const where = q ? { OR: [{ refNumber: { contains: q } }, { consulate: { contains: q } }] } : {};
  const [invitations, total] = await Promise.all([
    prisma.invitation.findMany({
      where,
      include: { program: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.invitation.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        title="الدعوات"
        description="دعوات موجَّهة للقنصليات (خدمة مدفوعة) — تصدر PDF مختوماً بورقتين ويُسجَّل رسمها كإيراد تلقائياً"
        action={<LinkButton href="/invitations/new">+ دعوة جديدة</LinkButton>}
      />

      <ErrorBanner message={sp.error} />

      <SuccessBanner message={sent} />

      <SearchBox q={q} basePath="/invitations" placeholder="بحث برقم الدعوة أو القنصلية..." />

      <Card>
        {invitations.length === 0 ? (
          <EmptyState message="لا توجد دعوات بعد" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>الرقم</Th>
                <Th>القنصلية</Th>
                <Th>الأشخاص</Th>
                <Th>اللغة</Th>
                <Th>الرسم</Th>
                <Th>الحالة</Th>
                <Th>التاريخ</Th>
                <Th></Th>
                <Th></Th>
                <Th></Th>
                <Th></Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => {
                const people = Array.isArray(inv.people) ? (inv.people as { name: string }[]) : [];
                return (
                  <tr key={inv.id}>
                    <Td className="font-mono text-xs">{inv.refNumber}</Td>
                    <Td>{inv.consulate || "—"}</Td>
                    <Td>
                      <Badge color="sky">{people.length} شخص</Badge>
                    </Td>
                    <Td>{LANG_LABEL[inv.language] ?? inv.language}</Td>
                    <Td className="font-medium text-slate-800">{formatCurrency(inv.fee, inv.feeCurrency)}</Td>
                    <Td>
                      <form action={toggleInvitationPaid.bind(null, inv.id)}>
                        <button type="submit" title="اضغط لتغيير الحالة">
                          {inv.paid ? <Badge color="green">محصّلة</Badge> : <Badge color="amber">غير محصّلة</Badge>}
                        </button>
                      </form>
                    </Td>
                    <Td>{formatDate(inv.docDate)}</Td>
                    <Td>
                      <Link href={`/invitations/${inv.id}/pdf`} target="_blank" className="text-rose-700 text-sm hover:underline">
                        📑 PDF مختوم
                      </Link>
                    </Td>
                    <Td>
                      <Link href={`/invitations/${inv.id}`} className="text-sky-600 text-sm hover:underline whitespace-nowrap">
                        ✎ تعديل
                      </Link>
                    </Td>
                    <Td>
                      <form action={duplicateInvitation.bind(null, inv.id)}>
                        <button type="submit" className="text-slate-500 text-sm hover:underline whitespace-nowrap">⧉ نسخة</button>
                      </form>
                    </Td>
                    <Td>
                      <EmailDocButton action={emailInvitation.bind(null, inv.id)} requireInput />
                    </Td>
                    <Td>
                      <DeleteButton action={deleteInvitation.bind(null, inv.id)} />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Pagination page={page} total={total} basePath="/invitations" params={{ q }} />
    </div>
  );
}
