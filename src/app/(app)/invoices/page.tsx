import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, EmptyState, LinkButton } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { SearchBox, Pagination, parsePage, PER_PAGE } from "@/components/ListControls";
import { formatDate, formatCurrency } from "@/lib/format";
import { deleteInvoice, type InvoiceItem } from "./actions";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" && sp.q.trim() !== "" ? sp.q.trim() : undefined;
  const page = parsePage(sp.page);
  const where = q
    ? {
        OR: [{ invoiceNumber: { contains: q } }, { customer: { name: { contains: q } } }],
      }
    : {};

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { customer: true, trip: { include: { program: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.invoice.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        title="الفواتير"
        description="فواتير رسمية ببنود ومبالغ على ورق الشركة، مرقمة تسلسلياً"
        action={<LinkButton href="/invoices/new">+ فاتورة جديدة</LinkButton>}
      />

      <SearchBox q={q} basePath="/invoices" placeholder="بحث برقم الفاتورة أو اسم العميل..." />

      <Card>
        {invoices.length === 0 ? (
          <EmptyState message="لا توجد فواتير بعد" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>الرقم</Th>
                <Th>العميل</Th>
                <Th>الرحلة</Th>
                <Th>التاريخ</Th>
                <Th>الإجمالي</Th>
                <Th></Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const items = (inv.items as InvoiceItem[]) ?? [];
                const totalAmount =
                  items.reduce((s, it) => s + it.qty * it.unitPrice, 0) - inv.discount;
                return (
                  <tr key={inv.id}>
                    <Td className="font-mono text-xs">{inv.invoiceNumber}</Td>
                    <Td>{inv.customer?.name ?? "—"}</Td>
                    <Td>{inv.trip?.program.name ?? "—"}</Td>
                    <Td>{formatDate(inv.docDate)}</Td>
                    <Td className="font-medium text-slate-800">
                      {formatCurrency(totalAmount, inv.currency)}
                    </Td>
                    <Td>
                      <Link
                        href={`/invoices/${inv.id}/pdf`}
                        target="_blank"
                        className="text-sky-600 text-sm hover:underline"
                      >
                        عرض / طباعة PDF
                      </Link>
                    </Td>
                    <Td>
                      <DeleteButton action={deleteInvoice.bind(null, inv.id)} />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Pagination page={page} total={total} basePath="/invoices" params={{ q }} />
    </div>
  );
}
