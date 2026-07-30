import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Select, Button, ErrorBanner } from "@/components/ui";
import { formatDate, formatDateForInput } from "@/lib/format";
import { fillTemplate, parseDocStyle } from "@/lib/documents";
import { createDocument } from "../actions";
import { DocumentForm } from "../DocumentForm";

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

      <DocumentForm
        action={createDocument}
        customers={customers}
        tripId={tripId}
        initial={{
          title: prefilledTitle,
          body: prefilledBody,
          customerId: prefilledCustomerId,
          docDate: formatDateForInput(new Date()),
          showStamp: true,
          style: prefilledStyle,
        }}
      />
    </div>
  );
}
