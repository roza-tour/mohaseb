import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader, Card, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { DeleteButton } from "@/components/DeleteButton";
import { ProgramForm } from "../ProgramForm";
import { updateProgram, deleteProgram } from "../actions";

export default async function EditProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const program = await prisma.tourProgram.findUnique({ where: { id } });

  if (!program) notFound();

  const estimatedCost =
    program.estHotelCostPerNight * (program.durationDays - 1) +
    program.estTransportCost +
    program.estGuideFee +
    program.estOtherCosts;

  const marginPercent =
    estimatedCost > 0 ? ((program.standardPrice - estimatedCost) / estimatedCost) * 100 : 0;

  const marginColor = marginPercent < 0 ? "red" : marginPercent < 15 ? "amber" : "green";

  return (
    <div>
      <PageHeader title="تعديل البرنامج" description={program.name} />

      <div className="space-y-6">
        <ProgramForm action={updateProgram.bind(null, id)} program={program} />

        <Card className="p-5 space-y-3">
          <h2 className="font-bold text-slate-800 text-sm">معاينة التكلفة التقديرية</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500 mb-1">التكلفة التقديرية الإجمالية للفرد الواحد</p>
              <p className="font-bold text-slate-800">{formatCurrency(estimatedCost, program.currency)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">نسبة الهامش المتوقع</p>
              <p className="font-bold text-slate-800">{marginPercent.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">تقييم الربحية</p>
              <Badge color={marginColor}>
                {marginPercent < 0 ? "خسارة" : marginPercent < 15 ? "هامش منخفض" : "هامش جيد"}
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <p className="text-sm text-slate-500">حذف هذا البرنامج نهائياً</p>
          <DeleteButton action={deleteProgram.bind(null, id)} />
        </Card>
      </div>
    </div>
  );
}
