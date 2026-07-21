import { Field, Input, Textarea, Select, Button, LinkButton, Card } from "@/components/ui";
import type { TourProgram } from "@prisma/client";

const currencies = ["DZD", "EUR", "USD", "TND", "MAD", "SAR"];

export function ProgramForm({
  action,
  program,
}: {
  action: (formData: FormData) => void;
  program?: TourProgram;
}) {
  return (
    <form action={action} className="space-y-6">
      <Card className="p-5 space-y-4">
        <Field label="اسم البرنامج">
          <Input name="name" defaultValue={program?.name} />
        </Field>

        <Field label="الوصف">
          <Textarea name="description" rows={3} defaultValue={program?.description ?? ""} />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="عدد أيام البرنامج">
            <Input
              type="number"
              name="durationDays"
              min={1}
              defaultValue={program?.durationDays ?? 1}
            />
          </Field>

          <Field label="العملة">
            <Select name="currency" defaultValue={program?.currency ?? "DZD"}>
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="السعر المعروض للعميل (للفرد الواحد)">
          <Input
            type="number"
            name="standardPrice"
            step="0.01"
            min={0}
            defaultValue={program?.standardPrice}
          />
        </Field>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-bold text-slate-800 text-sm">مكوّنات التكلفة التقديرية (للفرد الواحد)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="تكلفة الفندق لليلة الواحدة">
            <Input
              type="number"
              name="estHotelCostPerNight"
              step="0.01"
              min={0}
              defaultValue={program?.estHotelCostPerNight ?? 0}
            />
          </Field>

          <Field label="تكلفة النقل">
            <Input
              type="number"
              name="estTransportCost"
              step="0.01"
              min={0}
              defaultValue={program?.estTransportCost ?? 0}
            />
          </Field>

          <Field label="أتعاب المرشد السياحي">
            <Input
              type="number"
              name="estGuideFee"
              step="0.01"
              min={0}
              defaultValue={program?.estGuideFee ?? 0}
            />
          </Field>

          <Field label="تكاليف أخرى">
            <Input
              type="number"
              name="estOtherCosts"
              step="0.01"
              min={0}
              defaultValue={program?.estOtherCosts ?? 0}
            />
          </Field>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <Field label="وصف البرنامج يوماً بيوم">
          <Textarea
            name="itinerary"
            rows={6}
            placeholder={"اليوم الأول: ...\nاليوم الثاني: ..."}
            defaultValue={program?.itinerary ?? ""}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={program?.isActive ?? true}
            className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          برنامج نشط
        </label>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit">حفظ</Button>
        <LinkButton href="/programs" variant="secondary">
          إلغاء
        </LinkButton>
      </div>
    </form>
  );
}
