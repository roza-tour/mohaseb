import { prisma } from "@/lib/prisma";
import { PageHeader, Card, LinkButton, Table, Th, Td, EmptyState, Badge } from "@/components/ui";
import { formatDate, formatCurrency } from "@/lib/format";
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS, TripStatus } from "./statusLabels";

export default async function TripsPage() {
  const trips = await prisma.trip.findMany({
    include: { program: true, customer: true },
    orderBy: { startDate: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="الرحلات"
        description="إدارة الرحلات الفعلية وحجوزاتها"
        action={<LinkButton href="/trips/new">+ رحلة جديدة</LinkButton>}
      />

      <Card>
        {trips.length === 0 ? (
          <EmptyState message="لا توجد رحلات بعد" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>البرنامج</Th>
                <Th>العميل</Th>
                <Th>التاريخ</Th>
                <Th>الحالة</Th>
                <Th>السعر المتفق عليه</Th>
                <Th>إجراءات</Th>
              </tr>
            </thead>
            <tbody>
              {trips.map((t) => (
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
                    <LinkButton href={`/trips/${t.id}`} variant="secondary">
                      عرض
                    </LinkButton>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
