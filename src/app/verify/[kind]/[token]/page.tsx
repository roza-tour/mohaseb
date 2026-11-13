import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { websiteList } from "@/lib/format";
import { invoiceCustomerName } from "@/lib/invoiceCustomer";
import type { InvoiceItem } from "@/app/(app)/invoices/actions";
import type { Person } from "@/lib/invitation";
import { PAYMENT_METHOD_LABELS } from "@/lib/payments";
import { findTaskOrder, taskOrderTripLabel } from "@/lib/taskOrderView";
import {
  TASK_FIELDS,
  displayValue,
  readFields,
  readTravelers,
  travelerCount,
  type FieldGroup,
} from "@/lib/taskOrderFields";
import { taskOrderRef } from "@/app/(app)/task-orders/[id]/pdf/render";

const METHOD_FR: Record<string, string> = {
  CASH: "Espèces",
  BANK: "Virement bancaire",
  CHEQUE: "Chèque",
  OTHER: "Autre",
};

export const dynamic = "force-dynamic";

// صفحة عامة (بدون تسجيل دخول) يفتحها من يمسح رمز QR على الفاتورة أو الدعوة.
// تُقرأ من قاعدة البيانات لحظة الفتح، فأي تعديل على المستند يظهر هنا فوراً
// والرمز نفسه لا يتغيّر. الرابط سري (رمز عشوائي) ولا تُفهرسه محركات البحث.
export const metadata: Metadata = {
  title: "Vérification du document",
  robots: { index: false, follow: false },
};

type Row = { ar: string; fr: string; value: string; ltr?: boolean };

// تاريخ بأرقام لاتينية (يقرؤه موظف القنصلية أياً كانت لغته)
function fmt(d: Date | null | undefined): string {
  if (!d) return "—";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getUTCFullYear()}`;
}

function money(n: number, currency: string): string {
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function Shell({ agencyName, sites, children }: { agencyName: string; sites: string[]; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-100 py-6 px-4">
      <div className="mx-auto w-full max-w-xl rounded-2xl bg-white shadow-lg overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-6 py-4 text-center">
          <p className="text-lg font-bold tracking-wide">{agencyName}</p>
          <p className="text-xs text-slate-300 mt-0.5">التحقق من المستند · Vérification du document</p>
        </div>
        {children}
        <div className="bg-slate-50 px-6 py-3 text-center text-[11px] text-slate-500 border-t border-slate-100 space-y-0.5">
          <p>
            تم التحقق عبر النظام الإلكتروني لـ {agencyName} · Vérifié par le système de {agencyName}
          </p>
          {sites.length > 0 && <p dir="ltr">{sites.join("  •  ")}</p>}
        </div>
      </div>
    </main>
  );
}

function Confirmed({
  docAr,
  docFr,
  agencyName,
  feminine = true,
}: {
  docAr: string;
  docFr: string;
  agencyName: string;
  feminine?: boolean;
}) {
  return (
    <div className="px-6 pt-6">
      <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-500 px-5 py-5 text-center">
        <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white text-4xl font-bold shadow">
          ✓
        </div>
        <p className="text-2xl font-extrabold tracking-[0.2em] text-emerald-700" dir="ltr">
          CONFIRMED
        </p>
        <p className="text-sm font-semibold text-emerald-800 mt-1">مؤكَّد · Confirmé</p>
        <p className="text-xs text-emerald-700 mt-2 leading-relaxed">
          {docAr} {feminine ? "صادرة" : "صادر"} رسمياً عن {agencyName} {feminine ? "وبياناتها" : "وبياناته"} مطابقة
          لسجلاتنا.
          <br />
          <span dir="ltr">
            {docFr} {feminine ? "authentique, émise" : "authentique, émis"} par {agencyName} et conforme à nos
            registres.
          </span>
        </p>
        <p className="text-[11px] text-emerald-600 mt-2" dir="ltr">
          {/* وقت الفتح: يوضح أن البيانات حيّة ومحدَّثة */}
          Vérifié le {fmt(new Date())} à{" "}
          {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Algiers" })}
        </p>
      </div>
    </div>
  );
}

function Details({ rows }: { rows: Row[] }) {
  return (
    <dl className="px-6 pt-5 divide-y divide-slate-100">
      {rows.map((r) => (
        <div key={r.fr} className="flex items-start justify-between gap-4 py-2.5">
          <dt className="text-xs text-slate-500 shrink-0 leading-tight">
            {r.ar}
            <br />
            <span dir="ltr">{r.fr}</span>
          </dt>
          <dd className="text-sm font-semibold text-slate-800 text-left break-words" dir={r.ltr ? "ltr" : "auto"}>
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-6 pt-5">
      <p className="text-xs font-bold text-slate-600 mb-2">{title}</p>
      {children}
    </div>
  );
}

function PdfButtons({ links }: { links: { href: string; label: string }[] }) {
  return (
    <div className="px-6 py-6">
      <p className="text-xs text-slate-500 mb-2 text-center">
        عرض المستند كاملاً بآخر نسخة · Voir le document complet (dernière version)
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
          >
            📄 {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function NotFound({ agencyName, sites }: { agencyName: string; sites: string[] }) {
  return (
    <Shell agencyName={agencyName} sites={sites}>
      <div className="p-8 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white text-4xl font-bold">
          ✕
        </div>
        <p className="text-xl font-extrabold text-red-700" dir="ltr">
          NOT VERIFIED
        </p>
        <p className="font-bold text-slate-800 mt-2">مستند غير معروف · Document introuvable</p>
        <p className="text-sm text-slate-500 mt-1">
          لم يُعثر على مستند مطابق لهذا الرمز — قد يكون أُلغي أو أن الرمز غير صحيح.
          <br />
          <span dir="ltr">Aucun document ne correspond à ce code : il a pu être annulé ou le code est invalide.</span>
        </p>
      </div>
    </Shell>
  );
}

export default async function VerifyPage({ params }: { params: Promise<{ kind: string; token: string }> }) {
  const { kind, token } = await params;
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const agencyName = settings?.agencyName?.trim() || "ROZATOUR";
  const sites = websiteList(settings?.agencyWebsite);
  const base = `/verify/${kind}/${encodeURIComponent(token)}/pdf`;

  if (kind === "invoice") {
    const inv = await prisma.invoice.findUnique({
      where: { publicToken: token },
      include: { customer: true, trip: { include: { program: true } }, branch: true },
    });
    if (!inv) return <NotFound agencyName={agencyName} sites={sites} />;

    const items = Array.isArray(inv.items) ? (inv.items as InvoiceItem[]) : [];
    const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0);
    const total = subtotal - inv.discount;
    const rows: Row[] = [
      { ar: "رقم الفاتورة", fr: "N° de facture", value: inv.invoiceNumber, ltr: true },
      { ar: "التاريخ", fr: "Date", value: fmt(inv.docDate), ltr: true },
      { ar: "العميل", fr: "Client", value: invoiceCustomerName(inv) || "—" },
    ];
    if (inv.trip?.program?.name) rows.push({ ar: "الرحلة", fr: "Voyage", value: inv.trip.program.name });
    if (inv.trip) {
      rows.push({
        ar: "تواريخ الرحلة",
        fr: "Dates du voyage",
        value: `${fmt(inv.trip.startDate)} → ${fmt(inv.trip.endDate)}`,
        ltr: true,
      });
    }
    if (inv.purchasedItem?.trim()) {
      rows.push({ ar: "الخدمة المشتراة", fr: "Prestation", value: inv.purchasedItem.trim().split(/\r?\n/)[0] });
    }
    if (inv.branch) rows.push({ ar: "الفرع", fr: "Agence", value: inv.branch.nameFr?.trim() || inv.branch.name });
    rows.push({ ar: "الإجمالي", fr: "Total", value: money(total, inv.currency), ltr: true });
    if (inv.paid) rows.push({ ar: "حالة الدفع", fr: "Paiement", value: "✓ مدفوعة · Payée" });

    return (
      <Shell agencyName={agencyName} sites={sites}>
        <Confirmed docAr="هذه الفاتورة" docFr="Facture" agencyName={agencyName} />
        <Details rows={rows} />
        {items.length > 0 && (
          <Section title="البنود · Détail">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs" dir="ltr">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium">Désignation</th>
                    <th className="px-2 py-1.5 text-center font-medium">Qté</th>
                    <th className="px-2 py-1.5 text-right font-medium">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1.5 text-slate-800" dir="auto">
                        {it.description || "—"}
                      </td>
                      <td className="px-2 py-1.5 text-center">{Number(it.qty) || 0}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        {money((Number(it.qty) || 0) * (Number(it.unitPrice) || 0), inv.currency)}
                      </td>
                    </tr>
                  ))}
                  {inv.discount > 0 && (
                    <tr>
                      <td className="px-2 py-1.5 text-slate-500" colSpan={2}>
                        Remise
                      </td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">− {money(inv.discount, inv.currency)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        )}
        <PdfButtons
          links={[
            { href: `${base}?lang=fr`, label: "Facture (FR)" },
            { href: `${base}?lang=ar`, label: "الفاتورة (عربي)" },
            { href: `${base}?lang=en`, label: "Invoice (EN)" },
          ]}
        />
      </Shell>
    );
  }

  if (kind === "invitation") {
    const inv = await prisma.invitation.findUnique({
      where: { publicToken: token },
      include: { program: true },
    });
    if (!inv) return <NotFound agencyName={agencyName} sites={sites} />;

    const people = (Array.isArray(inv.people) ? inv.people : []) as Person[];
    const rows: Row[] = [
      { ar: "الرقم المرجعي", fr: "Référence", value: inv.refNumber, ltr: true },
      { ar: "التاريخ", fr: "Date", value: fmt(inv.docDate), ltr: true },
    ];
    if (inv.consulate.trim()) rows.push({ ar: "الجهة الموجَّهة إليها", fr: "Destinataire", value: inv.consulate.trim() });
    const programName = inv.programName?.trim() || inv.program?.name;
    if (programName) rows.push({ ar: "البرنامج", fr: "Programme", value: programName });
    if (inv.arrivalDate || inv.departureDate) {
      rows.push({
        ar: "مدة الإقامة",
        fr: "Séjour",
        value: `${fmt(inv.arrivalDate)} → ${fmt(inv.departureDate)}`,
        ltr: true,
      });
    }
    rows.push({ ar: "عدد الأشخاص", fr: "Nombre de personnes", value: String(people.length), ltr: true });

    return (
      <Shell agencyName={agencyName} sites={sites}>
        <Confirmed docAr="هذه الدعوة" docFr="Invitation" agencyName={agencyName} />
        <Details rows={rows} />
        {people.length > 0 && (
          <Section title="الأشخاص المدعوّون · Personnes invitées">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs" dir="ltr">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium">#</th>
                    <th className="px-2 py-1.5 text-left font-medium">Nom</th>
                    <th className="px-2 py-1.5 text-left font-medium">Passeport</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {people.map((p, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1.5 text-slate-400">{i + 1}</td>
                      <td className="px-2 py-1.5 font-semibold text-slate-800" dir="auto">
                        {p.name?.trim() || "—"}
                      </td>
                      <td className="px-2 py-1.5 font-mono">{p.passport?.trim() || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}
        <PdfButtons links={[{ href: base, label: "Invitation (PDF)" }]} />
      </Shell>
    );
  }

  if (kind === "receipt") {
    const pay = await prisma.payment.findUnique({
      where: { publicToken: token },
      include: { trip: { include: { program: true, customer: true } } },
    });
    if (!pay) return <NotFound agencyName={agencyName} sites={sites} />;
    const trip = pay.trip;
    const rows: Row[] = [
      { ar: "رقم السند", fr: "N° de reçu", value: pay.receiptNumber, ltr: true },
      { ar: "تاريخ الدفع", fr: "Date de paiement", value: fmt(pay.paidAt), ltr: true },
      { ar: "المبلغ المستلم", fr: "Montant reçu", value: money(pay.amount, trip.currency), ltr: true },
      {
        ar: "طريقة الدفع",
        fr: "Mode de paiement",
        value: `${PAYMENT_METHOD_LABELS[pay.method] ?? pay.method} · ${METHOD_FR[pay.method] ?? pay.method}`,
      },
    ];
    if (pay.reference?.trim()) rows.push({ ar: "المرجع", fr: "Référence", value: pay.reference.trim(), ltr: true });
    rows.push({ ar: "استلمنا من", fr: "Reçu de", value: trip.customer?.name?.trim() || "—" });
    if (trip.program?.name) rows.push({ ar: "الرحلة", fr: "Voyage", value: trip.program.name });
    rows.push({
      ar: "تواريخ الرحلة",
      fr: "Dates du voyage",
      value: `${fmt(trip.startDate)} → ${fmt(trip.endDate)}`,
      ltr: true,
    });

    return (
      <Shell agencyName={agencyName} sites={sites}>
        <Confirmed docAr="سند القبض هذا" docFr="Reçu" agencyName={agencyName} feminine={false} />
        <Details rows={rows} />
        <PdfButtons
          links={[
            { href: `${base}?lang=fr`, label: "Reçu (FR)" },
            { href: `${base}?lang=ar`, label: "سند القبض (عربي)" },
          ]}
        />
      </Shell>
    );
  }

  if (kind === "task-order") {
    const found = await prisma.taskOrder.findUnique({ where: { publicToken: token }, select: { id: true } });
    const order = found ? await findTaskOrder(found.id) : null;
    if (!order) return <NotFound agencyName={agencyName} sites={sites} />;
    const fields = readFields(order.fields);
    const isDriver = order.assigneeType === "DRIVER";
    const person = order.guide ?? order.driver;
    const trip = taskOrderTripLabel(order);

    const rows: Row[] = [
      { ar: "رقم الأمر", fr: "N° d'ordre", value: taskOrderRef(order.id, order.taskDate), ltr: true },
      { ar: "سُلّمت المهمة بتاريخ", fr: "Mission remise le", value: fmt(order.createdAt), ltr: true },
      { ar: "تاريخ بداية المهمة", fr: "Début de la mission", value: fmt(order.taskDate), ltr: true },
      { ar: "المكلَّف", fr: "Chargé de mission", value: person?.name?.trim() || "—" },
      {
        ar: "الصفة",
        fr: "Qualité",
        value: isDriver ? "سائق · Chauffeur" : "مرشد سياحي · Guide touristique",
      },
    ];
    if (order.tripInfo) {
      rows.push({ ar: "الرحلة", fr: "Voyage", value: trip.text });
      rows.push({
        ar: "تواريخ الرحلة",
        fr: "Dates du voyage",
        value: `${fmt(order.tripInfo.startDate)} → ${fmt(order.tripInfo.endDate)}`,
        ltr: true,
      });
    }
    // الخانات الاختيارية المكتوبة فقط: المركبة/الاعتماد، الرحلة اليدوية، التنقّل
    const groups: FieldGroup[] = [isDriver ? "vehicle" : "guide", "trip", "mission"];
    for (const g of groups) {
      for (const f of TASK_FIELDS) {
        if (f.group !== g || !fields[f.key]?.trim()) continue;
        if (g === "trip" && order.tripInfo && !f.withTrip) continue;
        rows.push({ ar: f.ar, fr: f.fr, value: displayValue(f, fields[f.key].trim()) });
      }
    }

    const travelers = readTravelers(order.travelers);
    const paxCount = travelerCount(fields, travelers);
    if (paxCount) rows.push({ ar: "عدد المسافرين", fr: "Nombre de voyageurs", value: paxCount, ltr: true });

    return (
      <Shell agencyName={agencyName} sites={sites}>
        <Confirmed docAr="أمر التكليف هذا" docFr="Ordre de mission" agencyName={agencyName} feminine={false} />
        <Details rows={rows} />
        {travelers.length > 0 && (
          <Section title="أسماء المسافرين · Voyageurs">
            <ol className="rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
              {travelers.map((n, i) => (
                <li key={i} className="flex gap-3 px-3 py-1.5">
                  <span className="text-slate-400 w-5">{i + 1}</span>
                  <span className="font-semibold text-slate-800" dir="auto">
                    {n}
                  </span>
                </li>
              ))}
            </ol>
          </Section>
        )}
        <PdfButtons
          links={[
            { href: `${base}?lang=fr`, label: "Ordre de mission (FR)" },
            { href: `${base}?lang=ar`, label: "أمر التكليف (عربي)" },
          ]}
        />
      </Shell>
    );
  }

  if (kind === "document") {
    const doc = await prisma.document.findUnique({
      where: { publicToken: token },
      include: { customer: true, trip: { include: { program: true } } },
    });
    if (!doc) return <NotFound agencyName={agencyName} sites={sites} />;
    const rows: Row[] = [
      { ar: "رقم المستند", fr: "N° du document", value: doc.docNumber, ltr: true },
      { ar: "التاريخ", fr: "Date", value: fmt(doc.docDate), ltr: true },
    ];
    if (doc.title.trim()) rows.push({ ar: "نوع المستند", fr: "Objet", value: doc.title.trim() });
    if (doc.customer?.name?.trim()) rows.push({ ar: "العميل", fr: "Client", value: doc.customer.name.trim() });
    if (doc.trip?.program?.name) rows.push({ ar: "الرحلة", fr: "Voyage", value: doc.trip.program.name });
    if (doc.trip) {
      rows.push({
        ar: "تواريخ الرحلة",
        fr: "Dates du voyage",
        value: `${fmt(doc.trip.startDate)} → ${fmt(doc.trip.endDate)}`,
        ltr: true,
      });
    }

    return (
      <Shell agencyName={agencyName} sites={sites}>
        <Confirmed docAr="هذا المستند" docFr="Document" agencyName={agencyName} feminine={false} />
        <Details rows={rows} />
        <PdfButtons links={[{ href: base, label: "Document (PDF)" }]} />
      </Shell>
    );
  }

  return <NotFound agencyName={agencyName} sites={sites} />;
}
