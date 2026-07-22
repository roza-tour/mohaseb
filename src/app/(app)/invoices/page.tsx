import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, EmptyState, LinkButton, Badge } from "@/components/ui";
import { ExportButton } from "@/components/ExportButton";
import { DeleteButton } from "@/components/DeleteButton";
import { PdfLangLinks } from "@/components/PdfLangLinks";
import { SearchBox, Pagination, parsePage, PER_PAGE } from "@/components/ListControls";
import { formatDate, formatCurrency } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";
import { deleteInvoice, toggleInvoicePaid, duplicateInvoice, type InvoiceItem } from "./actions";

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

  const [invoices, total, settings] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { customer: true, trip: { include: { program: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.invoice.count({ where }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);
  const agencyName = settings?.agencyName?.trim() || "روزا تور";

  return (
    <div>
      <PageHeader
        title="الفواتير"
        description="فواتير رسمية ببنود ومبالغ على ورق الشركة، مرقمة تسلسلياً"
        action={
          <div className="flex items-center gap-2">
            <ExportButton href="/invoices/export" />
            <LinkButton href="/invoices/new">+ فاتورة جديدة</LinkButton>
          </div>
        }
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
                <Th>الحالة</Th>
                <Th></Th>
                <Th></Th>
                <Th></Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const items = Array.isArray(inv.items) ? (inv.items as InvoiceItem[]) : [];
                const totalAmount =
                  items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0) - inv.discount;
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
                      <form action={toggleInvoicePaid.bind(null, inv.id)}>
                        <button type="submit" title="اضغط لتغيير الحالة">
                          {inv.paid ? <Badge color="green">مدفوعة</Badge> : <Badge color="amber">غير مدفوعة</Badge>}
                        </button>
                      </form>
                    </Td>
                    <Td>
                      <PdfLangLinks base={`/invoices/${inv.id}/pdf`} label="الفاتورة" langs={["ar", "fr", "en"]} />
                    </Td>
                    <Td>
                      <form action={duplicateInvoice.bind(null, inv.id)}>
                        <button type="submit" className="text-slate-500 text-sm hover:underline whitespace-nowrap">⧉ نسخة</button>
                      </form>
                    </Td>
                    <Td>
                      {(() => {
                        const wa = waLink(
                          inv.customer?.phone,
                          `مرحباً ${inv.customer?.name ?? ""}، مرفق فاتورتكم رقم ${inv.invoiceNumber} من ${agencyName}. شكراً لتعاملكم معنا.`
                        );
                        return wa ? (
                          <a href={wa} target="_blank" rel="noreferrer" className="text-green-600 text-sm hover:underline whitespace-nowrap">
                            📲 واتساب
                          </a>
                        ) : null;
                      })()}
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
