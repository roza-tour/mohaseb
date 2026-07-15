import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Field, Input, Button, Badge, EmptyState } from "@/components/ui";
import { formatCurrency } from "@/lib/format";

function mean(nums: number[]) {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

export default async function TripSuggestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const durationRaw = Number(get("duration"));
  const hasDuration = Number.isFinite(durationRaw) && durationRaw > 0;
  const duration = hasDuration ? durationRaw : undefined;
  const numPax = Number(get("numPax")) > 0 ? Number(get("numPax")) : 1;
  const toleranceRaw = Number(get("tolerance"));
  const tolerance = Number.isFinite(toleranceRaw) ? toleranceRaw : 1;
  const marginRaw = Number(get("margin"));
  const marginPct = Number.isFinite(marginRaw) ? marginRaw : 20;

  type Row = {
    id: string;
    name: string;
    description: string | null;
    durationDays: number;
    standardPrice: number;
    currency: string;
    approxCostTotal: number;
    approxCostPerPerson: number;
    suggestedPriceTotal: number;
    suggestedPricePerPerson: number;
    percentDiffVsStandard: number;
    historicalCount: number;
    avgAgreedPrice: number;
  };

  let rows: Row[] = [];

  if (duration !== undefined) {
    const programs = await prisma.tourProgram.findMany({
      where: {
        isActive: true,
        durationDays: { gte: Math.max(duration - tolerance, 0), lte: duration + tolerance },
      },
      orderBy: { durationDays: "asc" },
    });

    const trips = programs.length
      ? await prisma.trip.findMany({
          where: {
            programId: { in: programs.map((p) => p.id) },
            status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] },
          },
          include: { hotelBookings: true, flightBookings: true, otherBookings: true },
        })
      : [];

    rows = programs
      .map((program) => {
        const nights = Math.max(program.durationDays - 1, 0);
        const approxCostTotal =
          program.estHotelCostPerNight * nights * numPax +
          program.estTransportCost +
          program.estGuideFee +
          program.estOtherCosts;
        const approxCostPerPerson = approxCostTotal / numPax;
        const suggestedPriceTotal = approxCostTotal * (1 + marginPct / 100);
        const suggestedPricePerPerson = suggestedPriceTotal / numPax;
        const percentDiffVsStandard =
          program.standardPrice > 0
            ? ((suggestedPricePerPerson - program.standardPrice) / program.standardPrice) * 100
            : 0;

        const historicalTrips = trips.filter((t) => t.programId === program.id);
        const avgAgreedPrice = mean(historicalTrips.map((t) => t.agreedPrice));

        return {
          id: program.id,
          name: program.name,
          description: program.description,
          durationDays: program.durationDays,
          standardPrice: program.standardPrice,
          currency: program.currency,
          approxCostTotal,
          approxCostPerPerson,
          suggestedPriceTotal,
          suggestedPricePerPerson,
          percentDiffVsStandard,
          historicalCount: historicalTrips.length,
          avgAgreedPrice,
        };
      })
      .sort((a, b) => Math.abs(a.durationDays - duration) - Math.abs(b.durationDays - duration));
  }

  return (
    <div>
      <PageHeader
        title="اقتراح رحلة وتسعير"
        description="اختر مدة الرحلة المطلوبة للعميل لعرض البرامج المناسبة مع احتساب التكلفة التقريبية والسعر المقترح مقارنة بالأسعار المعروضة لنفس البرنامج"
      />

      <Card className="p-5 mb-6">
        <form method="get" className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
          <Field label="مدة الرحلة المطلوبة (بالأيام)">
            <Input type="number" min={1} name="duration" defaultValue={get("duration") ?? ""} required />
          </Field>
          <Field label="عدد الأشخاص">
            <Input type="number" min={1} name="numPax" defaultValue={get("numPax") ?? "1"} />
          </Field>
          <Field label="هامش المرونة بالأيام (± يوم)">
            <Input type="number" min={0} name="tolerance" defaultValue={get("tolerance") ?? "1"} />
          </Field>
          <Field label="نسبة هامش الربح المطلوبة %">
            <Input type="number" min={0} name="margin" defaultValue={get("margin") ?? "20"} />
          </Field>
          <div className="col-span-2 sm:col-span-4">
            <Button type="submit">بحث عن رحلات مناسبة</Button>
          </div>
        </form>
      </Card>

      {duration === undefined ? (
        <EmptyState message="أدخل مدة الرحلة المطلوبة لعرض الاقتراحات المناسبة" />
      ) : rows.length === 0 ? (
        <EmptyState message="لا توجد برامج سياحية مطابقة لهذه المدة حالياً — جرّب زيادة هامش المرونة." />
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const diff = r.percentDiffVsStandard;
            let badge: React.ReactNode;
            if (diff > 10) {
              badge = <Badge color="amber">أعلى من السعر المعروض بنسبة {diff.toFixed(1)}%</Badge>;
            } else if (diff < -10) {
              badge = <Badge color="sky">أقل من السعر المعروض بنسبة {Math.abs(diff).toFixed(1)}%</Badge>;
            } else {
              badge = <Badge color="green">مطابق تقريباً للسعر المعروض</Badge>;
            }

            return (
              <Card key={r.id} className="p-5">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <h3 className="font-bold text-slate-800">{r.name}</h3>
                  <Badge color="slate">المدة: {r.durationDays} أيام</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">السعر المعروض للفرد</p>
                    <p className="font-medium text-slate-800">{formatCurrency(r.standardPrice, r.currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">التكلفة التقريبية</p>
                    <p className="font-medium text-slate-800">{formatCurrency(r.approxCostTotal, r.currency)}</p>
                    <p className="text-xs text-slate-400">
                      (للفرد: {formatCurrency(r.approxCostPerPerson, r.currency)})
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">السعر المقترح (بهامش {marginPct}%)</p>
                    <p className="font-bold text-sky-700 text-base">
                      {formatCurrency(r.suggestedPriceTotal, r.currency)}
                    </p>
                    <p className="text-xs text-slate-400">
                      (للفرد: {formatCurrency(r.suggestedPricePerPerson, r.currency)})
                    </p>
                  </div>
                </div>

                <div className="mb-2">{badge}</div>

                {r.historicalCount > 0 && (
                  <p className="text-xs text-slate-500">
                    متوسط الأسعار الفعلية المتفق عليها سابقاً لنفس البرنامج:{" "}
                    {formatCurrency(r.avgAgreedPrice, r.currency)} ({r.historicalCount} رحلة سابقة)
                  </p>
                )}

                {r.description && <p className="text-xs text-slate-400 mt-2">{r.description}</p>}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
