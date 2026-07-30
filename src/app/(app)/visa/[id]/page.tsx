import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, ErrorBanner } from "@/components/ui";
import { formatDateForInput } from "@/lib/format";
import { updateVisaApplication } from "../actions";
import { VisaFields } from "../VisaFields";

const d = (v: Date | null) => (v ? formatDateForInput(v) : "");

export default async function EditVisaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const app = await prisma.visaApplication.findUnique({
    where: { id },
    include: { travelers: { orderBy: { id: "asc" } } },
  });
  if (!app) notFound();

  const fileLink = "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition";

  return (
    <div>
      <PageHeader
        title={`تعديل ملف الفيزا ${app.refNumber}`}
        description="عدّل البيانات أو المسافرين ثم احفظ — الرقم المرجعي لا يتغيّر، وأعِد تنزيل الملفين بعد الحفظ"
        action={
          <div className="flex items-center gap-2">
            <Link href={`/visa/${app.id}/excel`} className={fileLink}>
              📊 Excel
            </Link>
            <Link href={`/visa/${app.id}/word`} className={fileLink}>
              📄 Word
            </Link>
          </div>
        }
      />

      <ErrorBanner message={sp.error} />

      <VisaFields
        action={updateVisaApplication.bind(null, id)}
        submitLabel="حفظ التعديلات"
        initial={{
          wilaya: app.wilaya,
          wilayasConcernees: app.wilayasConcernees,
          arrivalDate: d(app.arrivalDate),
          departureDate: d(app.departureDate),
          programDetail: app.programDetail,
          feePerPerson: app.feePerPerson,
          feeCurrency: app.feeCurrency,
          notes: app.notes ?? "",
          travelers: app.travelers.map((t) => ({
            nom: t.nom,
            prenom: t.prenom,
            naissance: d(t.dateNaissance),
            lieuNaissance: t.lieuNaissance,
            residence: t.lieuResidence,
            type: t.typePasseport,
            numero: t.numeroPasseport,
            delivrance: d(t.dateDelivrance),
            expiration: d(t.dateExpiration),
            nationalite: t.nationalite,
            visaAnterieur: t.visaAnterieur,
          })),
        }}
      />
    </div>
  );
}
