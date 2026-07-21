import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Field, Select, Input, Textarea, Button, LinkButton, ErrorBanner } from "@/components/ui";
import { formatDateForInput } from "@/lib/format";
import { createInvitation } from "../actions";
import { PeopleEditor, type CustomerOpt } from "../PeopleEditor";

const CURRENCIES = ["USD", "EUR", "DZD", "TND", "MAD", "SAR"];

export default async function NewInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;

  const [customers, programs] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.tourProgram.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const customerOpts: CustomerOpt[] = customers.map((c) => ({
    id: c.id,
    name: c.name,
    passport: c.passport ?? "",
    companions: Array.isArray(c.companions)
      ? (c.companions as { name: string; passport: string }[])
      : [],
  }));

  return (
    <div>
      <PageHeader title="دعوة جديدة" description="طلب موافقة على تأشيرة موجَّه لقنصلية لعدة أشخاص — يصدر PDF مختوم بورقتين ويُسجَّل رسمه كإيراد" />
      <ErrorBanner message={sp.error} />

      <Card className="p-5 max-w-3xl">
        <form action={createInvitation} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="اللغة">
              <Select name="language" defaultValue="fr">
                <option value="fr">Français</option>
                <option value="ar">عربي</option>
                <option value="en">English</option>
              </Select>
            </Field>
            <Field label="القنصلية / الجهة الموجَّه إليها">
              <Input name="consulate" placeholder="مثال: France à Alger" />
            </Field>
            <Field label="البرنامج (لمخطط الرحلة)">
              <Select name="programId" defaultValue="">
                <option value="">بدون</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="الأشخاص (المقدّم الأساسي + المرافقون)">
            <PeopleEditor customers={customerOpts} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="تاريخ الوصول">
              <Input type="date" name="arrivalDate" />
            </Field>
            <Field label="تاريخ المغادرة">
              <Input type="date" name="departureDate" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="رسم الدعوة">
              <Input type="number" name="fee" min={0} step="0.01" defaultValue={20} />
            </Field>
            <Field label="عملة الرسم">
              <Select name="feeCurrency" defaultValue="USD">
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="مخطط الرحلة (اختياري — يُملأ من البرنامج إن تُرك فارغاً)">
            <Textarea name="itinerary" rows={6} placeholder="اترك فارغاً لاستخدام برنامج الرحلة المختار" />
          </Field>

          <Field label="ملاحظات (اختياري)">
            <Input name="notes" />
          </Field>

          <p className="text-xs text-slate-500">
            سيُسجَّل رسم الدعوة تلقائياً كإيراد (مستحق خدمة) في الحسابات عند الإصدار.
          </p>

          <input type="hidden" name="docDate" defaultValue={formatDateForInput(new Date())} />

          <div className="flex items-center gap-2">
            <Button type="submit">إصدار الدعوة (PDF)</Button>
            <LinkButton href="/invitations" variant="secondary">
              إلغاء
            </LinkButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
