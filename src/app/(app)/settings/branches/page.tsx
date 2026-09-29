import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  PageHeader,
  Card,
  Field,
  Input,
  Button,
  Table,
  Th,
  Td,
  EmptyState,
  LinkButton,
  ErrorBanner,
  SuccessBanner,
} from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
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
        description="أسماء الفروع التي تُشترى منها الخدمات. الفاتورة تبقى فاتورة الوكالة بترويستها وختمها كما هي، ويُذكَر فيها الفرع فقط — وبلا فرع تخرج عادية. كل نسخة من الفاتورة تعرض الاسم بلغتها، والاسم الفارغ يُستعمل مكانه العربي."
        action={
          <LinkButton href="/settings" variant="secondary">
            رجوع للإعدادات
          </LinkButton>
        }
      />

      <ErrorBanner message={sp.error} />
      <SuccessBanner message={sp.saved} />

      <Card>
        {branches.length === 0 ? (
          <EmptyState message="لا توجد فروع بعد — أضف أول فرع من النموذج أسفل الصفحة" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>الاسم بالعربية</Th>
                <Th>بالفرنسية</Th>
                <Th>بالإنجليزية</Th>
                <Th>الترتيب</Th>
                <Th>يظهر في قائمة الفاتورة</Th>
                <Th></Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id}>
                  <Td>
                    <form action={updateBranch.bind(null, b.id)} id={`branch-${b.id}`} className="contents" />
                    <Input form={`branch-${b.id}`} name="name" defaultValue={b.name} />
                  </Td>
                  <Td>
                    <Input form={`branch-${b.id}`} name="nameFr" dir="ltr" defaultValue={b.nameFr} />
                  </Td>
                  <Td>
                    <Input form={`branch-${b.id}`} name="nameEn" dir="ltr" defaultValue={b.nameEn} />
                  </Td>
                  <Td className="w-24">
                    <Input form={`branch-${b.id}`} type="number" name="sortOrder" defaultValue={b.sortOrder} />
                  </Td>
                  <Td>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input form={`branch-${b.id}`} type="checkbox" name="isActive" defaultChecked={b.isActive} />
                      مُفعَّل
                    </label>
                  </Td>
                  <Td>
                    <Button form={`branch-${b.id}`} type="submit" variant="secondary">
                      حفظ
                    </Button>
                  </Td>
                  <Td>
                    <DeleteButton action={deleteBranch.bind(null, b.id)} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card className="p-5 max-w-xl">
        <h2 className="font-bold text-slate-800 mb-4">إضافة فرع</h2>
        <form action={createBranch} className="space-y-4">
          <Field label="الاسم بالعربية" required>
            <Input name="name" placeholder="مثال: كيميت ترافيل" />
          </Field>
          <Field label="الاسم بالفرنسية (يظهر في النسخة الفرنسية من الفاتورة)">
            <Input name="nameFr" dir="ltr" placeholder="Kemet Travel" />
          </Field>
          <Field label="الاسم بالإنجليزية (يظهر في النسخة الإنجليزية من الفاتورة)">
            <Input name="nameEn" dir="ltr" placeholder="Kemet Travel" />
          </Field>
          <Field label="ترتيب الظهور في القائمة">
            <Input type="number" name="sortOrder" defaultValue={branches.length} />
          </Field>
          <Button type="submit">إضافة الفرع</Button>
        </form>
      </Card>
    </div>
  );
}
