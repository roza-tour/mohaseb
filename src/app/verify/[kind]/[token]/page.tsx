import { prisma } from "@/lib/prisma";
import { formatDate, formatCurrency, nameOr } from "@/lib/format";
import type { InvoiceItem } from "@/app/(app)/invoices/actions";

export const dynamic = "force-dynamic";

// صفحة تحقق عامة (بدون تسجيل دخول) يفتحها من يمسح رمز QR على المستند،
// لتأكيد أن المستند صادر فعلاً عن الوكالة ومطابق لبياناتها.

type Row = { label: string; value: string };

function Panel({
  agencyName,
  ok,
  docType,
  rows,
}: {
  agencyName: string;
  ok: boolean;
  docType?: string;
  rows?: Row[];
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-lg overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-6 py-5 text-center">
          <p className="text-lg font-bold">{agencyName}</p>
          <p className="text-xs text-slate-300 mt-1">التحقق من صحة المستند</p>
        </div>

        {ok ? (
          <div className="p-6">
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 mb-5">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-bold text-emerald-800">مستند موثّق</p>
                <p className="text-xs text-emerald-700">
                  هذا {docType} صادر رسمياً عن {agencyName}.
                </p>
              </div>
            </div>
            <dl className="divide-y divide-slate-100">
              {rows?.map((r) => (
                <div key={r.label} className="flex items-start justify-between gap-4 py-2.5">
                  <dt className="text-sm text-slate-500 shrink-0">{r.label}</dt>
                  <dd className="text-sm font-medium text-slate-800 text-left" dir="auto">
                    {r.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <div className="p-8 text-center">
            <span className="text-4xl">⚠️</span>
            <p className="font-bold text-slate-800 mt-3">مستند غير معروف</p>
            <p className="text-sm text-slate-500 mt-1">
              لم يتم العثور على مستند مطابق لهذا الرمز. قد يكون الرابط غير صحيح.
            </p>
          </div>
        )}

        <div className="bg-slate-50 px-6 py-3 text-center text-[11px] text-slate-400 border-t border-slate-100">
          تم التحقق عبر النظام الإلكتروني لـ {agencyName}
        </div>
      </div>
    </main>
  );
}

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ kind: string; token: string }>;
}) {
  const { kind, token } = await params;
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const agencyName = settings?.agencyName?.trim() || "روزا تور";

  if (kind === "invoice") {
    const inv = await prisma.invoice.findUnique({
      where: { publicToken: token },
      include: { customer: true, trip: { include: { program: true } } },
    });
    if (!inv) return <Panel agencyName={agencyName} ok={false} />;
    const items = Array.isArray(inv.items) ? (inv.items as InvoiceItem[]) : [];
    const total =
      items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0) - inv.discount;
    const rows: Row[] = [
      { label: "نوع المستند", value: "فاتورة" },
      { label: "رقم الفاتورة", value: inv.invoiceNumber },
      { label: "التاريخ", value: formatDate(inv.docDate) },
      { label: "العميل", value: nameOr(inv.customer?.name) },
    ];
    if (inv.trip?.program?.name) rows.push({ label: "الرحلة", value: inv.trip.program.name });
    rows.push({ label: "الإجمالي", value: formatCurrency(total, inv.currency) });
    return <Panel agencyName={agencyName} ok docType="الفاتورة" rows={rows} />;
  }

  if (kind === "invitation") {
    const inv = await prisma.invitation.findUnique({
      where: { publicToken: token },
      include: { program: true },
    });
    if (!inv) return <Panel agencyName={agencyName} ok={false} />;
    const people = Array.isArray(inv.people)
      ? (inv.people as { name?: string }[]).map((p) => p?.name).filter(Boolean)
      : [];
    const rows: Row[] = [
      { label: "نوع المستند", value: "دعوة" },
      { label: "الرقم المرجعي", value: inv.refNumber },
      { label: "التاريخ", value: formatDate(inv.docDate) },
      { label: "المقدّم", value: people[0] ? String(people[0]) : "—" },
    ];
    if (people.length > 1) rows.push({ label: "عدد الأشخاص", value: String(people.length) });
    if (inv.program?.name) rows.push({ label: "البرنامج", value: inv.program.name });
    return <Panel agencyName={agencyName} ok docType="الدعوة" rows={rows} />;
  }

  return <Panel agencyName={agencyName} ok={false} />;
}
