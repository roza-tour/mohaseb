import { Card, Field, Select, Input, Textarea, Button, LinkButton } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { AssigneeFields } from "./AssigneeFields";

export type TaskOrderInitial = {
  tripId: string;
  assigneeType: "GUIDE" | "DRIVER";
  guideId: string;
  driverId: string;
  taskDate: string;
  details: string;
};

// نموذج أمر التكليف المشترك بين الإنشاء والتعديل
export function TaskOrderForm({
  action,
  trips,
  guides,
  drivers,
  initial,
  submitLabel = "إصدار الأمر (PDF)",
}: {
  action: (formData: FormData) => void;
  trips: { id: string; startDate: Date; program: { name: string }; customer: { name: string } }[];
  guides: { id: string; name: string }[];
  drivers: { id: string; name: string }[];
  initial: TaskOrderInitial;
  submitLabel?: string;
}) {
  return (
    <Card className="p-5 max-w-2xl">
      <form action={action} className="space-y-4">
        <Field label="الرحلة" required>
          <Select name="tripId" required defaultValue={initial.tripId}>
            <option value="">اختر الرحلة...</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.program.name} — {t.customer.name} — {formatDate(t.startDate)}
              </option>
            ))}
          </Select>
        </Field>

        <AssigneeFields
          guides={guides}
          drivers={drivers}
          initialType={initial.assigneeType}
          initialGuideId={initial.guideId}
          initialDriverId={initial.driverId}
        />

        <Field label="تاريخ المهمة" required>
          <Input type="date" name="taskDate" required defaultValue={initial.taskDate} />
        </Field>

        <Field label="تفاصيل المهمة">
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
