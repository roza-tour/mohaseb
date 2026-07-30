import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Field, Select, Button, ErrorBanner } from "@/components/ui";
import { formatDateForInput } from "@/lib/format";
import { createVisaApplication } from "../actions";
import { VisaFields } from "../VisaFields";

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

      <VisaFields
        action={createVisaApplication}
        submitLabel="إنشاء الفيزا وتجهيز الملفين"
        initial={{
          wilaya: "",
          wilayasConcernees: "",
          arrivalDate: prefillArrival,
          departureDate: prefillDeparture,
          programDetail: prefillProgram,
          feePerPerson: 40,
          feeCurrency: "USD",
          notes: "",
          travelers: initialTravelers,
        }}
      />
    </div>
  );
}
