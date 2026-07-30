import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Field, Input, Textarea, Button, LinkButton, ErrorBanner } from "@/components/ui";
import { updateOffer } from "../actions";

export default async function EditOfferPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const offer = await prisma.offer.findUnique({ where: { id } });
  if (!offer) notFound();

  return (
    <div>
      <PageHeader
        title="تعديل العرض"
        description="عدّل نص العرض أو عنوانه ثم احفظ — يمكنك إرساله بعدها من صفحة العروض"
      />

      <ErrorBanner message={sp.error} />

      {offer.sentCount > 0 && (
        <div className="mb-4 max-w-3xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ هذا العرض أُرسل {offer.sentCount} مرة من قبل — التعديل لن يغيّر الرسائل المُرسَلة سابقاً.
        </div>
      )}

      <Card className="p-5 max-w-3xl">
        <form action={updateOffer.bind(null, id)} className="space-y-4">
          <Field label="عنوان العرض (يظهر كموضوع الرسالة)">
            <Input name="subject" defaultValue={offer.subject} />
          </Field>
          <Field label="نص العرض">
            <Textarea name="body" rows={9} defaultValue={offer.body} />
          </Field>
          <div className="flex items-center gap-2">
            <Button type="submit">حفظ التعديلات</Button>
            <LinkButton href="/offers" variant="secondary">
              إلغاء
            </LinkButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
