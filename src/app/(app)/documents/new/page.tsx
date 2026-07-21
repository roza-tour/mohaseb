import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Field, Select, Input, Textarea, Button, LinkButton, ErrorBanner } from "@/components/ui";
import { formatDate, formatDateForInput } from "@/lib/format";
import { fillTemplate, parseDocStyle, TEMPLATE_VARIABLES } from "@/lib/documents";
import { StyleFields } from "../StyleFields";
import { createDocument } from "../actions";

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const templateId = typeof sp.templateId === "string" ? sp.templateId : "";
  const tripId = typeof sp.tripId === "string" ? sp.tripId : "";

  const [templates, trips, customers, settings] = await Promise.all([
    prisma.documentTemplate.findMany({ orderBy: { name: "asc" } }),
    prisma.trip.findMany({
      include: { program: true, customer: true },
      orderBy: { startDate: "desc" },
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);

  const template = templateId ? templates.find((t) => t.id === templateId) : null;
  const trip = tripId ? trips.find((t) => t.id === tripId) : null;

  const prefilledTitle = template?.title ?? "";
  const prefilledStyle = parseDocStyle(template?.style);
  const prefilledBody = template ? fillTemplate(template.body, { trip, settings }) : "";
  const prefilledCustomerId = trip?.customerId ?? "";

  return (
    <div>
      <PageHeader
        title="مستند جديد"
        description="اختر قالباً جاهزاً واربطه برحلة لتعبئة البيانات تلقائياً، أو اكتب مستنداً بنص حر من الصفر — يمكنك تعديل النص بالكامل قبل الإصدار"
      />

      <ErrorBanner message={sp.error} />

      <Card className="p-5 mb-6 max-w-3xl">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-auto sm:min-w-52">
            <label className="block text-sm font-medium text-slate-700 mb-1">القالب</label>
            <Select name="templateId" defaultValue={templateId}>
              <option value="">بدون قالب (نص حر)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-full sm:w-auto sm:min-w-64">
            <label className="block text-sm font-medium text-slate-700 mb-1">الرحلة (لتعبئة البيانات تلقائياً)</label>
            <Select name="tripId" defaultValue={tripId}>
              <option value="">بدون ربط برحلة</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.program.name} — {t.customer.name} — {formatDate(t.startDate)}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="secondary">
            تحميل القالب والبيانات
          </Button>
        </form>
      </Card>

      <Card className="p-5 max-w-3xl">
        <form action={createDocument} className="space-y-4">
          <input type="hidden" name="tripId" value={tripId} />

          <Field label="عنوان المستند (يظهر بخط كبير في الـ PDF)">
            <Input name="title" defaultValue={prefilledTitle} placeholder="مثال: دعوة سياحية" />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="العميل (اختياري)">
              <Select name="customerId" defaultValue={prefilledCustomerId}>
                <option value="">بدون عميل</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="تاريخ المستند">
              <Input type="date" name="docDate" defaultValue={formatDateForInput(new Date())} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="اسم القنصلية / الجهة الموجَّه إليها (للدعوة — اختياري)">
              <Input name="consulate" placeholder="مثال: Consulat Général de France à Alger" />
            </Field>
            <Field label="رقم جواز سفر المسافر (للدعوة — اختياري)">
              <Input name="passport" placeholder="مثال: GI937083" />
            </Field>
          </div>

          <Field label="نص المستند">
            <Textarea
              name="body"
              rows={14}
              defaultValue={prefilledBody}
              placeholder="اكتب نص المستند هنا... كل سطر فارغ يبدأ فقرة جديدة في الـ PDF"
            />
          </Field>

          <p className="text-xs text-slate-500">
            المتغيرات المتاحة في القوالب (تُستبدل تلقائياً عند تحميل قالب مع رحلة):{" "}
            {TEMPLATE_VARIABLES.map((v) => `${v.token} = ${v.label}`).join("، ")}
          </p>

          <StyleFields style={prefilledStyle} />

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="showStamp" defaultChecked />
            إظهار خانة ختم الوكالة أسفل المستند
          </label>

          <div className="flex items-center gap-2">
            <Button type="submit">إصدار المستند (PDF)</Button>
            <LinkButton href="/documents" variant="secondary">
              إلغاء
            </LinkButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
