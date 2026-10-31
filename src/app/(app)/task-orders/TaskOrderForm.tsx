import { Card, Field, Input, Textarea, Button, LinkButton } from "@/components/ui";
import { TripPicker } from "./TripPicker";
import { AssigneePicker, type Assignee } from "./AssigneePicker";
import { FieldGroupInputs } from "./FieldGroupInputs";
import { ExtraRowsEditor } from "./ExtraRowsEditor";
import type { FieldValues, ExtraRow } from "@/lib/taskOrderFields";

export type TaskOrderInitial = {
  tripId: string;
  assigneeType: "GUIDE" | "DRIVER";
  guideId: string;
  driverId: string;
  taskDate: string;
  details: string;
  fields: FieldValues;
  extraRows: ExtraRow[];
};

// نموذج أمر التكليف — لكل صفة نموذجها: أمر المرشد غير أمر السائق
export function TaskOrderForm({
  action,
  trips,
  guides,
  drivers,
  initial,
  submitLabel = "إصدار الأمر (PDF)",
}: {
  action: (formData: FormData) => void;
  trips: { id: string; startDate: Date; programName: string; customerName: string }[];
  guides: Assignee[];
  drivers: Assignee[];
  initial: TaskOrderInitial;
  submitLabel?: string;
}) {
  const isDriver = initial.assigneeType === "DRIVER";
  return (
    <Card className="p-5 max-w-3xl">
      <form action={action} className="space-y-4">
        <input type="hidden" name="assigneeType" value={initial.assigneeType} />

        <AssigneePicker
          isDriver={isDriver}
          people={isDriver ? drivers : guides}
          initialId={isDriver ? initial.driverId : initial.guideId}
          initialFields={initial.fields}
        />

        <TripPicker trips={trips} initialTripId={initial.tripId} initialFields={initial.fields} />

        <Field label="تاريخ المهمة" required>
          <Input type="date" name="taskDate" required defaultValue={initial.taskDate} />
        </Field>

        <FieldGroupInputs group="mission" initial={initial.fields} />

        <ExtraRowsEditor initial={initial.extraRows} />

        <Field label="تفاصيل المهمة (اختياري)">
          <Textarea
            name="details"
            rows={4}
            defaultValue={initial.details}
            placeholder="مثال: استقبال العميل من المطار الساعة ٩ صباحاً وتوصيله إلى الفندق..."
          />
        </Field>

        <div className="flex items-center gap-2">
          <Button type="submit">{submitLabel}</Button>
          <LinkButton href="/task-orders" variant="secondary">
            إلغاء
          </LinkButton>
        </div>
      </form>
    </Card>
  );
}
