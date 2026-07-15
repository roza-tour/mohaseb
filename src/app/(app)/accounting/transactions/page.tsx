import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, EmptyState, LinkButton, Badge } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { formatDate, formatCurrency } from "@/lib/format";
import { deleteTransaction } from "./actions";
import type { Prisma } from "@prisma/client";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const typeFilter = params.type === "INCOME" || params.type === "EXPENSE" ? params.type : undefined;

  const where: Prisma.TransactionWhereInput = typeFilter ? { type: typeFilter } : {};

  const [transactions, totals] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { trip: { include: { program: true, customer: true } } },
      orderBy: { date: "desc" },
      take: 300,
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      _sum: { amount: true },
    }),
  ]);

  const totalIncome = totals.find((t) => t.type === "INCOME")?._sum.amount ?? 0;
  const totalExpense = totals.find((t) => t.type === "EXPENSE")?._sum.amount ?? 0;
  const net = totalIncome - totalExpense;

  const tabs: { key: string; label: string; href: string }[] = [
    { key: "ALL", label: "الكل", href: "/accounting/transactions" },
    { key: "INCOME", label: "الإيرادات", href: "/accounting/transactions?type=INCOME" },
    { key: "EXPENSE", label: "المصروفات", href: "/accounting/transactions?type=EXPENSE" },
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
          <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalIncome)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-slate-500 mb-1">إجمالي المصروفات</p>
          <p className="text-lg font-bold text-red-600">{formatCurrency(totalExpense)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-slate-500 mb-1">الصافي</p>
          <p className={`text-lg font-bold ${net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {formatCurrency(net)}
          </p>
        </Card>
      </div>

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
    </div>
  );
}
