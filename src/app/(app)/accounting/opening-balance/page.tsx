import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Table, Th, Td, EmptyState, LinkButton, Badge } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { formatCurrency } from "@/lib/format";
import { deleteOpeningBalanceItem } from "./actions";
import type { OpeningBalance } from "@prisma/client";

const SECTIONS: { type: string; title: string }[] = [
  { type: "ASSET", title: "الأصول" },
  { type: "LIABILITY", title: "الالتزامات" },
  { type: "EQUITY", title: "حقوق الملكية" },
];

function Section({ title, items }: { title: string; items: OpeningBalance[] }) {
  const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
  return (
    <Card>
      <div className="px-4 py-3 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      </div>
      {items.length === 0 ? (
        <EmptyState message="لا توجد بنود" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>البند</Th>
              <Th>المبلغ</Th>
              <Th>ملاحظات</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <Td className="font-medium text-slate-800">{item.itemName}</Td>
                <Td>{formatCurrency(item.amount)}</Td>
                <Td>{item.notes ?? "—"}</Td>
                <Td>
                  <DeleteButton action={deleteOpeningBalanceItem.bind(null, item.id)} />
                </Td>
              </tr>
            ))}
            <tr>
              <Td className="font-bold text-slate-800">الإجمالي</Td>
              <Td className="font-bold text-slate-800">{formatCurrency(subtotal)}</Td>
              <Td></Td>
              <Td></Td>
            </tr>
          </tbody>
        </Table>
      )}
    </Card>
  );
}

export default async function OpeningBalancePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const yearParam = Array.isArray(params.year) ? params.year[0] : params.year;
  const year = yearParam ? parseInt(yearParam, 10) : currentYear;
  const safeYear = Number.isFinite(year) ? year : currentYear;

  const items = await prisma.openingBalance.findMany({
    where: { fiscalYear: safeYear },
    orderBy: { itemType: "asc" },
  });

  const byType = (type: string) => items.filter((i) => i.itemType === type);

  const totalAssets = byType("ASSET").reduce((sum, i) => sum + i.amount, 0);
  const totalLiabilities = byType("LIABILITY").reduce((sum, i) => sum + i.amount, 0);
  const totalEquity = byType("EQUITY").reduce((sum, i) => sum + i.amount, 0);
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  const diff = totalAssets - totalLiabilitiesAndEquity;
  const isBalanced = Math.abs(diff) <= 0.01;

  return (
    <div>
      <PageHeader
        title="الميزانية الافتتاحية"
        description="بنود الأصول والالتزامات وحقوق الملكية في بداية السنة المالية"
        action={
          <LinkButton href={`/accounting/opening-balance/new?year=${safeYear}`}>+ إضافة بند</LinkButton>
        }
      />

      <div className="flex items-center justify-center gap-4 mb-6">
        <Link
          href={`/accounting/opening-balance?year=${safeYear - 1}`}
          className="rounded-lg px-3 py-1.5 text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
        >
          السنة السابقة
        </Link>
        <span className="text-lg font-bold text-slate-800">{safeYear}</span>
        <Link
          href={`/accounting/opening-balance?year=${safeYear + 1}`}
          className="rounded-lg px-3 py-1.5 text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
        >
          السنة التالية
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {SECTIONS.map((s) => (
          <Section key={s.type} title={s.title} items={byType(s.type)} />
        ))}
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-slate-500 mb-1">إجمالي الأصول</p>
            <p className="text-base font-bold text-slate-800">{formatCurrency(totalAssets)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">إجمالي الالتزامات + حقوق الملكية</p>
            <p className="text-base font-bold text-slate-800">{formatCurrency(totalLiabilitiesAndEquity)}</p>
          </div>
          <div className="text-left">
            {isBalanced ? (
              <Badge color="green">متوازنة ✓</Badge>
            ) : (
              <div className="flex flex-col items-end gap-1">
                <Badge color="red">غير متوازنة</Badge>
                <span className="text-xs text-slate-500">الفرق: {formatCurrency(Math.abs(diff))}</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
