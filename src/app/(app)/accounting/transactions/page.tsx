import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, EmptyState, LinkButton, Badge } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { formatDate, formatCurrency } from "@/lib/format";
import { deleteTransaction } from "./actions";
import { Pagination, parsePage } from "@/components/ListControls";
import type { Prisma } from "@prisma/client";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const typeFilter = params.type === "INCOME" || params.type === "EXPENSE" ? params.type : undefined;
  const from = typeof params.from === "string" && params.from ? params.from : undefined;
  const to = typeof params.to === "string" && params.to ? params.to : undefined;
  const page = parsePage(params.page);
  const TX_PER_PAGE = 50;

  const where: Prisma.TransactionWhereInput = {
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(from || to
      ? {
          date: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
          },
        }
      : {}),
  };

  const [transactions, txCount, totals] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { trip: { include: { program: true, customer: true } } },
      orderBy: { date: "desc" },
      skip: (page - 1) * TX_PER_PAGE,
      take: TX_PER_PAGE,
    }),
    prisma.transaction.count({ where }),
    prisma.transaction.groupBy({
      by: ["type", "currency"],
      _sum: { amount: true },
    }),
  ]);

  // مجاميع مفصولة حسب العملة (لا تُجمع عملات مختلفة كرقم واحد)
  const currencies = [...new Set(totals.map((t) => t.currency))].sort();
  const sumOf = (type: string, currency: string) =>
    totals.find((t) => t.type === type && t.currency === currency)?._sum.amount ?? 0;
  const fmtPerCurrency = (type: "INCOME" | "EXPENSE" | "NET") =>
    currencies.length === 0
      ? formatCurrency(0)
      : currencies
          .map((c) => {
            const v =
              type === "NET" ? sumOf("INCOME", c) - sumOf("EXPENSE", c) : sumOf(type, c);
            return formatCurrency(v, c);
          })
          .join("  +  ");
  const netNegative = currencies.every((c) => sumOf("INCOME", c) - sumOf("EXPENSE", c) < 0);

  const dateQS = `${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`;
  const tabs: { key: string; label: string; href: string }[] = [
    { key: "ALL", label: "الكل", href: `/accounting/transactions?x=1${dateQS}` },
    { key: "INCOME", label: "الإيرادات", href: `/accounting/transactions?type=INCOME${dateQS}` },
    { key: "EXPENSE", label: "المصروفات", href: `/accounting/transactions?type=EXPENSE${dateQS}` },
  ];
  const activeTab = typeFilter ?? "ALL";

  return (
    <div>
      <PageHeader
        title="القيود المحاسبية"
        description="سجل الإيرادات والمصروفات"
        action={<LinkButton href="/accounting/transactions/new">+ قيد جديد</LinkButton>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <p className="text-xs text-slate-500 mb-1">إجمالي الإيرادات</p>
          <p className="text-lg font-bold text-emerald-600">{fmtPerCurrency("INCOME")}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-slate-500 mb-1">إجمالي المصروفات</p>
          <p className="text-lg font-bold text-red-600">{fmtPerCurrency("EXPENSE")}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-slate-500 mb-1">الصافي</p>
          <p className={`text-lg font-bold ${netNegative ? "text-red-600" : "text-emerald-600"}`}>
            {fmtPerCurrency("NET")}
          </p>
        </Card>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 mb-4">
        {typeFilter ? <input type="hidden" name="type" value={typeFilter} /> : null}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">من تاريخ</label>
          <input type="date" name="from" defaultValue={from ?? ""} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">إلى تاريخ</label>
          <input type="date" name="to" defaultValue={to ?? ""} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 text-sm font-medium">
          تطبيق
        </button>
      </form>

      <div className="flex items-center gap-2 mb-4">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              activeTab === tab.key ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <Card>
        {transactions.length === 0 ? (
          <EmptyState message="لا توجد قيود محاسبية بعد" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>التاريخ</Th>
                <Th>النوع</Th>
                <Th>التصنيف</Th>
                <Th>المبلغ</Th>
                <Th>الرحلة المرتبطة</Th>
                <Th>الوصف</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <Td>{formatDate(t.date)}</Td>
                  <Td>
                    {t.type === "INCOME" ? (
                      <Badge color="green">إيراد</Badge>
                    ) : (
                      <Badge color="red">مصروف</Badge>
                    )}
                  </Td>
                  <Td>{t.category}</Td>
                  <Td className="font-medium text-slate-800">{formatCurrency(t.amount, t.currency)}</Td>
                  <Td>{t.trip ? `${t.trip.program.name} — ${t.trip.customer.name}` : "—"}</Td>
                  <Td>{t.description ?? "—"}</Td>
                  <Td>
                    <DeleteButton action={deleteTransaction.bind(null, t.id)} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Pagination
        page={page}
        total={txCount}
        perPage={TX_PER_PAGE}
        basePath="/accounting/transactions"
        params={{ type: typeFilter, from, to }}
      />
    </div>
  );
}
