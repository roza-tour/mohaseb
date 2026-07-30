import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, ErrorBanner } from "@/components/ui";
import { formatDateForInput } from "@/lib/format";
import { parseDocStyle } from "@/lib/documents";
import { updateDocument } from "../actions";
import { DocumentForm } from "../DocumentForm";

export default async function EditDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const [doc, customers] = await Promise.all([
    prisma.document.findUnique({ where: { id } }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!doc) notFound();

  return (
    <div>
      <PageHeader
        title={`تعديل المستند ${doc.docNumber}`}
        description="عدّل النص أو التنسيق ثم احفظ — رقم المستند لا يتغيّر، وأعِد تنزيل الـ PDF بعد الحفظ"
        action={
          <Link
            href={`/documents/${doc.id}/pdf`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            📑 عرض الـ PDF
          </Link>
        }
      />

      <ErrorBanner message={sp.error} />

      <DocumentForm
        action={updateDocument.bind(null, id)}
        customers={customers}
        submitLabel="حفظ التعديلات"
        isEdit
        initial={{
          title: doc.title,
          body: doc.body,
          customerId: doc.customerId ?? "",
          docDate: formatDateForInput(doc.docDate),
          showStamp: doc.showStamp,
          style: parseDocStyle(doc.style),
        }}
      />
    </div>
  );
}
