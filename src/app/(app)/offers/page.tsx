import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Field, Input, Textarea, Button, EmptyState, ErrorBanner } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { formatDate } from "@/lib/format";
import { isEmailConfigured } from "@/lib/email";
import { createOffer, deleteOffer, sendOffer } from "./actions";

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const [offers, recipientCount] = await Promise.all([
    prisma.offer.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.customer.count({ where: { email: { not: null } } }),
  ]);
  const configured = isEmailConfigured();

  return (
    <div>
      <PageHeader
        title="عروض الولاء"
        description="أنشئ عرضاً وأرسله بالبريد لكل العملاء الذين لديهم بريد إلكتروني — بتحكّم كامل في التوقيت"
      />

      <ErrorBanner message={sp.error} />
      {sp.created && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 text-sm">
          تم حفظ العرض. اضغط «إرسال» عندما تريد إرساله للعملاء.
        </div>
      )}
      {sp.updated && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 text-sm">
          تم حفظ تعديلات العرض ✅
        </div>
      )}
      {sp.sent && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 text-sm">
          تم إرسال العرض إلى {sp.sent} عميل ✅
        </div>
      )}

      {!configured && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-sm">
          ⚠️ البريد غير مُعدّ بعد. أضِف بيانات SMTP في ملف <code>.env</code> على السيرفر (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
          حتى تتمكّني من إرسال العروض.
        </div>
      )}

      <Card className="p-5 mb-6 max-w-3xl">
        <h2 className="font-bold text-slate-800 mb-4">عرض جديد</h2>
        <form action={createOffer} className="space-y-4">
          <Field label="عنوان العرض (يظهر كموضوع الرسالة)">
            <Input name="subject" placeholder="مثال: عرض خاص لرحلات الصحراء هذا الموسم" />
          </Field>
          <Field label="نص العرض">
            <Textarea name="body" rows={7} placeholder="اكتب تفاصيل العرض هنا... كل سطر يظهر كفقرة في البريد" />
          </Field>
          <Button type="submit">حفظ العرض</Button>
        </form>
      </Card>

      <p className="text-sm text-slate-600 mb-3">
        📧 عدد العملاء الذين لديهم بريد إلكتروني: <span className="font-bold">{recipientCount}</span>
      </p>

      <Card className="p-5">
        <h2 className="font-bold text-slate-800 mb-4">العروض المحفوظة</h2>
        {offers.length === 0 ? (
          <EmptyState message="لا توجد عروض بعد" />
        ) : (
          <div className="divide-y divide-slate-100">
            {offers.map((o) => (
              <div key={o.id} className="py-4 flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800">{o.subject}</p>
                  <p className="text-sm text-slate-500 line-clamp-2 whitespace-pre-line">{o.body}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    أُنشئ {formatDate(o.createdAt)}
                    {o.lastSentAt ? ` · آخر إرسال ${formatDate(o.lastSentAt)} · أُرسل ${o.sentCount} مرة` : " · لم يُرسل بعد"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {configured && recipientCount > 0 ? (
                    <ConfirmButton
                      action={sendOffer.bind(null, o.id)}
                      label="📨 إرسال للعملاء"
                      confirmMessage={`إرسال هذا العرض بالبريد إلى ${recipientCount} عميل؟`}
                    />
                  ) : null}
                  <Link href={`/offers/${o.id}`} className="text-sky-600 text-sm hover:underline whitespace-nowrap">
                    ✎ تعديل
                  </Link>
                  <DeleteButton action={deleteOffer.bind(null, o.id)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
