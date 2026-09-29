import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PageHeader, Card, LinkButton, ErrorBanner, SuccessBanner, EmptyState } from "@/components/ui";
import { BranchForm } from "./BranchForm";
import { createBranch, updateBranch, deleteBranch } from "./actions";

export default async function BranchesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (role !== "ADMIN") {
    return (
      <div>
        <PageHeader title="الفروع" />
        <Card className="p-8 text-center text-sm text-slate-500">هذه الصفحة متاحة لحساب المدير فقط.</Card>
      </div>
    );
  }

  const branches = await prisma.branch.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });

  return (
    <div className="space-y-6">
      <PageHeader
        title="الفروع"
        description="الوكالة الأم وما يتفرّع عنها. الفاتورة تُصدَر باسم فرع فتحمل ترويسته وبياناته وحسابه البنكي."
        action={
          <LinkButton href="/settings" variant="secondary">
            رجوع للإعدادات
          </LinkButton>
        }
      />

      <ErrorBanner message={sp.error} />
      <SuccessBanner message={sp.saved} />

      {branches.length === 0 ? (
        <Card className="p-6">
          <EmptyState message="لا توجد فروع بعد — أضف أول فرع من النموذج أسفل الصفحة" />
        </Card>
      ) : (
        branches.map((b) => (
          <BranchForm
            key={b.id}
            branch={b}
            action={updateBranch.bind(null, b.id)}
            onDelete={deleteBranch.bind(null, b.id)}
            submitLabel="حفظ التعديلات"
          />
        ))
      )}

      <BranchForm action={createBranch} submitLabel="إضافة الفرع" />
    </div>
  );
}
