import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Field, Input, Textarea, Select, Button, LinkButton, ErrorBanner } from "@/components/ui";
import { formatDateForInput } from "@/lib/format";
import { createVisaApplication } from "../actions";
import { TravelersEditor } from "../TravelersEditor";

export default async function NewVisaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const tripId = typeof sp.tripId === "string" ? sp.tripId : "";

  const trips = await prisma.trip.findMany({
    include: { program: true, customer: true },
    orderBy: { startDate: "desc" },
    take: 50,
  });
  const trip = tripId ? trips.find((t) => t.id === tripId) : null;

  // تعبئة مسبقة من الرحلة إن اختيرت: التواريخ وتفاصيل البرنامج من مخطط البرنامج
  const prefillArrival = trip ? formatDateForInput(trip.startDate) : "";
  const prefillDeparture = trip ? formatDateForInput(trip.endDate) : "";
  const prefillProgram = trip?.program.itinerary ?? "";

  return (
    <div>
      <PageHeader
        title="إنشاء فيزا صحراوية"
        description="أدخل بيانات الرحلة والمسافرين (أو امسح جوازاتهم بالكاميرا) — ثم حمّل الملفين الرسميين معبأين"
      />

      <ErrorBanner message={sp.error} />

      <Card className="p-5 mb-6">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-auto sm:min-w-72">
            <Field label="تعبئة من رحلة (اختياري — يملأ التواريخ والبرنامج تلقائياً)">
              <Select name="tripId" defaultValue={tripId}>
                <option value="">بدون</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.program.name} — {t.customer.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Button type="submit" variant="secondary">
            تحميل بيانات الرحلة
          </Button>
        </form>
      </Card>

      <form action={createVisaApplication} className="space-y-6">
        <Card className="p-5 space-y-4">
          <h2 className="font-bold text-slate-800">بيانات الملف</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="الولاية الموجه إليها الملف (Wilaya de...)">
              <Input name="wilaya" dir="ltr" placeholder="Tamanrasset" />
            </Field>
            <Field label="الولايات المعنية بالبرنامج (Wilayas concernées)">
              <Input name="wilayasConcernees" dir="ltr" placeholder="Tamanrasset, Djanet, Illizi" />
            </Field>
            <Field label="تاريخ الوصول" required>
              <Input type="date" name="arrivalDate" required defaultValue={prefillArrival} />
            </Field>
            <Field label="تاريخ المغادرة" required>
              <Input type="date" name="departureDate" required defaultValue={prefillDeparture} />
            </Field>
          </div>

          <Field label="تفاصيل البرنامج يوماً بيوم (تُملأ في ملف الوورد الرسمي — يفضل بالفرنسية)">
            <Textarea
              name="programDetail"
              rows={8}
              defaultValue={prefillProgram}
              placeholder={"Jour 1 : Arrivée à l'aéroport de Tamanrasset, accueil et transfert à l'hôtel...\nJour 2 : ..."}
            />
          </Field>

          <Field label="ملاحظات داخلية (لا تظهر في الملفات)">
            <Input name="notes" />
          </Field>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="font-bold text-slate-800">المسافرون</h2>
          <p className="text-xs text-slate-500">
            📷 زر «مسح الجواز» يقرأ صورة الجواز (السطرين أسفل الصفحة) ويملأ الاسم واللقب ورقم الجواز والجنسية
            وتاريخ الميلاد وتاريخ الانتهاء تلقائياً — القراءة تتم داخل متصفحك ولا تُرفع الصورة لأي مكان.
          </p>
          <TravelersEditor />
        </Card>

        <div className="flex items-center gap-2">
          <Button type="submit">إنشاء الفيزا وتجهيز الملفين</Button>
          <LinkButton href="/visa" variant="secondary">
            إلغاء
          </LinkButton>
        </div>
      </form>
    </div>
  );
}
