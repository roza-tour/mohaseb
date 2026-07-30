import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, ErrorBanner } from "@/components/ui";
import { formatDateForInput } from "@/lib/format";
import { updateInvitation } from "../actions";
import { InvitationForm } from "../InvitationForm";
import type { CustomerOpt } from "../PeopleEditor";

export default async function EditInvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const [invitation, customers, programs] = await Promise.all([
    prisma.invitation.findUnique({ where: { id } }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.tourProgram.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);
  if (!invitation) notFound();

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
      <PageHeader
        title={`تعديل الدعوة ${invitation.refNumber}`}
        description="عدّل البيانات ثم احفظ — الرقم المرجعي وتاريخ الإصدار لا يتغيّران، وأعِد تنزيل الـ PDF بعد الحفظ"
        action={
          <Link
            href={`/invitations/${invitation.id}/pdf`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            📑 عرض الـ PDF
          </Link>
        }
      />
      <ErrorBanner message={sp.error} />

      <InvitationForm
        action={updateInvitation.bind(null, id)}
        customers={customerOpts}
        programs={programs}
        submitLabel="حفظ التعديلات"
        isEdit
        initial={{
          language: invitation.language,
          consulate: invitation.consulate,
          programId: invitation.programId ?? "",
          people: Array.isArray(invitation.people)
            ? (invitation.people as { name: string; passport: string }[])
            : [],
          arrivalDate: invitation.arrivalDate ? formatDateForInput(invitation.arrivalDate) : "",
          departureDate: invitation.departureDate ? formatDateForInput(invitation.departureDate) : "",
          fee: invitation.fee,
          feeCurrency: invitation.feeCurrency,
          itinerary: invitation.itinerary ?? "",
          notes: invitation.notes ?? "",
        }}
      />
    </div>
  );
}
