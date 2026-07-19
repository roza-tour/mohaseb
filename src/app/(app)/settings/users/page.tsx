import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  PageHeader,
  Card,
  Field,
  Input,
  Select,
  Button,
  Table,
  Th,
  Td,
  Badge,
  ErrorBanner,
  LinkButton,
} from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { formatDate } from "@/lib/format";
import { createUser, deleteUser, resetUserPassword } from "./actions";

export default async function UsersPage({
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
        <PageHeader title="إدارة المستخدمين" />
        <Card className="p-8 text-center text-sm text-slate-500">
          هذه الصفحة متاحة لحساب المدير فقط.
        </Card>
      </div>
    );
  }

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-6">
      <PageHeader
        title="إدارة المستخدمين"
        description="أنشئ حسابات لموظفي الوكالة — حساب المدير (ADMIN) يدير المستخدمين، وحساب الموظف (STAFF) يستخدم النظام دون إدارة الحسابات"
        action={
          <LinkButton href="/settings" variant="secondary">
            رجوع للإعدادات
          </LinkButton>
        }
      />

      <ErrorBanner message={sp.error} />

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>الاسم</Th>
              <Th>البريد الإلكتروني</Th>
              <Th>الصلاحية</Th>
              <Th>أنشئ بتاريخ</Th>
              <Th>إعادة تعيين كلمة المرور</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <Td className="font-medium text-slate-800">{u.name}</Td>
                <Td>{u.email}</Td>
                <Td>
                  <Badge color={u.role === "ADMIN" ? "sky" : "slate"}>
                    {u.role === "ADMIN" ? "مدير" : "موظف"}
                  </Badge>
                </Td>
                <Td>{formatDate(u.createdAt)}</Td>
                <Td>
                  <form action={resetUserPassword.bind(null, u.id)} className="flex items-center gap-2">
                    <input
                      type="password"
                      name="newPassword"
                      minLength={8}
                      required
                      placeholder="كلمة مرور جديدة"
                      className="w-36 rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                    />
                    <button type="submit" className="text-xs text-sky-600 hover:underline">
                      تعيين
                    </button>
                  </form>
                </Td>
                <Td>
                  {u.email !== session?.user?.email && (
                    <DeleteButton
                      action={deleteUser.bind(null, u.id)}
                      confirmMessage={`هل أنت متأكد من حذف المستخدم ${u.name}؟`}
                    />
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card className="p-5 max-w-2xl">
        <h2 className="font-bold text-slate-800 mb-4">إضافة مستخدم جديد</h2>
        <form action={createUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="الاسم">
            <Input name="name" required />
          </Field>
          <Field label="البريد الإلكتروني">
            <Input name="email" type="email" required />
          </Field>
          <Field label="كلمة المرور (8 أحرف على الأقل)">
            <Input name="password" type="password" minLength={8} required />
          </Field>
          <Field label="الصلاحية">
            <Select name="role" defaultValue="STAFF">
              <option value="STAFF">موظف</option>
              <option value="ADMIN">مدير</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit">إضافة المستخدم</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
