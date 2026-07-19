import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, LinkButton, Table, Th, Td, EmptyState, Badge } from "@/components/ui";
import { SearchBox, Pagination, parsePage, PER_PAGE } from "@/components/ListControls";
import { formatDate, formatCurrency } from "@/lib/format";
import { TRIP_STATUSES, TRIP_STATUS_LABELS, TRIP_STATUS_COLORS, TripStatus } from "./statusLabels";
import type { Prisma } from "@prisma/client";

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" && sp.q.trim() !== "" ? sp.q.trim() : undefined;
  const status =
    typeof sp.status === "string" && (TRIP_STATUSES as readonly string[]).includes(sp.status)
      ? sp.status
      : undefined;
  const page = parsePage(sp.page);

  const where: Prisma.TripWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { customer: { name: { contains: q } } },
            { program: { name: { contains: q } } },
          ],
        }
      : {}),
  };

  const [trips, total] = await Promise.all([
    prisma.trip.findMany({
      where,
      include: { program: true, customer: true, payments: true },
      orderBy: { startDate: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.trip.count({ where }),
  ]);

  const statusTabs: { key?: string; label: string }[] = [
    { key: undefined, label: "الكل" },
    ...TRIP_STATUSES.map((s) => ({ key: s, label: TRIP_STATUS_LABELS[s] })),
  ];

  const tabHref = (key?: string) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (key) qs.set("status", key);
    const str = qs.toString();
    return str ? `/trips?${str}` : "/trips";
  };

  return (
    <div>
      <PageHeader
        title="الرحلات"
        description="إدارة الرحلات الفعلية وحجوزاتها ودفعاتها"
        action={<LinkButton href="/trips/new">+ رحلة جديدة</LinkButton>}
      />

      <SearchBox
        q={q}
        basePath="/trips"
        placeholder="بحث باسم العميل أو البرنامج..."
        extraParams={{ status }}
      />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {statusTabs.map((tab) => (
          <Link
            key={tab.key ?? "ALL"}
            href={tabHref(tab.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              status === tab.key || (!status && !tab.key)
                ? "bg-sky-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <Card>
        {trips.length === 0 ? (
          <EmptyState message="لا توجد رحلات مطابقة" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>البرنامج</Th>
                <Th>العميل</Th>
                <Th>التاريخ</Th>
                <Th>الحالة</Th>
                <Th>السعر المتفق عليه</Th>
                <Th>المتبقي على العميل</Th>
                <Th>إجراءات</Th>
              </tr>
            </thead>
            <tbody>
              {trips.map((t) => {
                const paid = t.payments.reduce((s, p) => s + p.amount, 0);
                const remaining = t.agreedPrice - paid;
                return (
                  <tr key={t.id}>
                    <Td>{t.program.name}</Td>
                    <Td>{t.customer.name}</Td>
                    <Td>
                      {formatDate(t.startDate)} - {formatDate(t.endDate)}
                    </Td>
                    <Td>
                      <Badge color={TRIP_STATUS_COLORS[t.status as TripStatus]}>
                        {TRIP_STATUS_LABELS[t.status as TripStatus] ?? t.status}
                      </Badge>
                    </Td>
                    <Td>{formatCurrency(t.agreedPrice, t.currency)}</Td>
                    <Td>
                      {remaining > 0 ? (
                        <Badge color="amber">{formatCurrency(remaining, t.currency)}</Badge>
                      ) : (
                        <Badge color="green">مسدَّدة</Badge>
                      )}
                    </Td>
                    <Td>
                      <LinkButton href={`/trips/${t.id}`} variant="secondary">
                        عرض
                      </LinkButton>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Pagination page={page} total={total} basePath="/trips" params={{ q, status }} />
    </div>
  );
}
