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
  const customerId = typeof sp.customerId === "string" ? sp.customerId : "";
  const invitationId = typeof sp.invitationId === "string" ? sp.invitationId : "";

  const [trips, customers, invitations] = await Promise.all([
    prisma.trip.findMany({
      include: { program: true, customer: true },
      orderBy: { startDate: "desc" },
      take: 50,
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, take: 500 }),
    prisma.invitation.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  const trip = tripId ? trips.find((t) => t.id === tripId) : null;

  // تعبئة مسبقة من الرحلة إن اختيرت: التواريخ وتفاصيل البرنامج من مخطط البرنامج
  const prefillArrival = trip ? formatDateForInput(trip.startDate) : "";
  const prefillDeparture = trip ? formatDateForInput(trip.endDate) : "";
  const prefillProgram = trip?.program.itinerary ?? "";

  // تعبئة المسافرين مسبقاً من عميل (+ مرافقيه) أو من دعوة موجودة
  type Person = { name?: string; passport?: string };
  // نقسم الاسم الكامل: آخر كلمة = اللقب، والباقي = الاسم
  const splitName = (full: string) => {
    const parts = (full || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return { prenom: parts[0] ?? "", nom: "" };
    return { nom: parts[parts.length - 1], prenom: parts.slice(0, -1).join(" ") };
  };
  const peopleToTravelers = (people: Person[]) =>
    people
      .filter((p) => (p?.name ?? "").trim())
      .map((p) => ({ ...splitName(p.name ?? ""), numero: (p.passport ?? "").trim() }));

  let initialTravelers: Array<{ nom?: string; prenom?: string; numero?: string }> = [];
  if (customerId) {
    const c = customers.find((x) => x.id === customerId);
    if (c) {
      const companions = (Array.isArray(c.companions) ? c.companions : []) as Person[];
      initialTravelers = peopleToTravelers([{ name: c.name, passport: c.passport ?? "" }, ...companions]);
    }
  } else if (invitationId) {
    const inv = invitations.find((x) => x.id === invitationId);
    if (inv) {
      const people = (Array.isArray(inv.people) ? inv.people : []) as Person[];
      initialTravelers = peopleToTravelers(people);
    }
  }

  return (
    <div>
      <PageHeader
        title="إنشاء فيزا صحراوية"
        description="أدخل بيانات الرحلة والمسافرين (أو امسح جوازاتهم بالكاميرا) — ثم حمّل الملفين الرسميين معبأين"
      />

      <ErrorBanner message={sp.error} />

      <Card className="p-5 mb-6">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-auto sm:min-w-64">
            <Field label="تعبئة من رحلة (يملأ التواريخ والبرنامج)">
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
          <div className="w-full sm:w-auto sm:min-w-56">
            <Field label="تعبئة المسافرين من عميل (+ مرافقيه)">
              <Select name="customerId" defaultValue={customerId}>
                <option value="">بدون</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="w-full sm:w-auto sm:min-w-56">
            <Field label="أو تعبئة المسافرين من دعوة">
              <Select name="invitationId" defaultValue={invitationId}>
                <option value="">بدون</option>
                {invitations.map((inv) => {
                  const first = (Array.isArray(inv.people) ? (inv.people as { name?: string }[])[0]?.name : "") || "";
                  return (
                    <option key={inv.id} value={inv.id}>
                      {inv.refNumber}{first ? ` — ${first}` : ""}
                    </option>
                  );
                })}
              </Select>
            </Field>
          </div>
          <Button type="submit" variant="secondary">
            تحميل البيانات
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="رسم الخدمة لكل مسافر (يُسجَّل كإيراد تلقائياً)">
              <Input type="number" name="feePerPerson" min={0} step="0.01" defaultValue={40} />
            </Field>
            <Field label="عملة الرسم">
              <Select name="feeCurrency" defaultValue="USD">
                {["USD", "EUR", "DZD", "TND", "MAD", "SAR"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

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
          <TravelersEditor initial={initialTravelers} />
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
