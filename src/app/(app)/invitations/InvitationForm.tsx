import { Card, Field, Select, Input, Textarea, Button, LinkButton } from "@/components/ui";
import { formatDateForInput } from "@/lib/format";
import { PeopleEditor, type CustomerOpt } from "./PeopleEditor";

const CURRENCIES = ["USD", "EUR", "DZD", "TND", "MAD", "SAR"];

export type InvitationInitial = {
  language: string;
  consulate: string;
  programId: string;
  people: { name: string; passport: string }[];
  arrivalDate: string;
  departureDate: string;
  fee: number;
  feeCurrency: string;
  itinerary: string;
  notes: string;
};

const BLANK: InvitationInitial = {
  language: "fr",
  consulate: "",
  programId: "",
  people: [],
  arrivalDate: "",
  departureDate: "",
  fee: 20,
  feeCurrency: "USD",
  itinerary: "",
  notes: "",
};

// نموذج الدعوة المشترك بين الإنشاء والتعديل
export function InvitationForm({
  action,
  customers,
  programs,
  initial,
  submitLabel = "إصدار الدعوة (PDF)",
  isEdit = false,
}: {
  action: (formData: FormData) => void;
  customers: CustomerOpt[];
  programs: { id: string; name: string }[];
  initial?: InvitationInitial;
  submitLabel?: string;
  isEdit?: boolean;
}) {
  const v = initial ?? BLANK;

  return (
    <Card className="p-5 max-w-3xl">
      <form action={action} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="اللغة">
            <Select name="language" defaultValue={v.language}>
              <option value="fr">Français</option>
              <option value="ar">عربي</option>
              <option value="en">English</option>
            </Select>
          </Field>
          <Field label="القنصلية / الجهة الموجَّه إليها">
            <Input name="consulate" defaultValue={v.consulate} placeholder="مثال: France à Alger" />
          </Field>
          <Field label="البرنامج (لمخطط الرحلة)">
            <Select name="programId" defaultValue={v.programId}>
              <option value="">بدون</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="الأشخاص (المقدّم الأساسي + المرافقون)">
          <PeopleEditor customers={customers} initial={v.people} />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="تاريخ الوصول">
            <Input type="date" name="arrivalDate" defaultValue={v.arrivalDate} />
          </Field>
          <Field label="تاريخ المغادرة">
            <Input type="date" name="departureDate" defaultValue={v.departureDate} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="رسم الدعوة">
            <Input type="number" name="fee" min={0} step="0.01" defaultValue={v.fee} />
          </Field>
          <Field label="عملة الرسم">
            <Select name="feeCurrency" defaultValue={v.feeCurrency}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="مخطط الرحلة (اختياري — يُملأ من البرنامج إن تُرك فارغاً)">
          <Textarea
            name="itinerary"
            rows={6}
            defaultValue={v.itinerary}
            placeholder="اترك فارغاً لاستخدام برنامج الرحلة المختار"
          />
        </Field>

        <Field label="ملاحظات (اختياري)">
          <Input name="notes" defaultValue={v.notes} />
        </Field>

        <p className="text-xs text-slate-500">
          {isEdit
            ? "تعديل الرسم أو عملته يُحدِّث قيد الإيراد المرتبط في الحسابات تلقائياً."
            : "سيُسجَّل رسم الدعوة تلقائياً كإيراد (مستحق خدمة) في الحسابات عند الإصدار."}
        </p>

        {!isEdit && <input type="hidden" name="docDate" defaultValue={formatDateForInput(new Date())} />}

        <div className="flex items-center gap-2">
          <Button type="submit">{submitLabel}</Button>
          <LinkButton href="/invitations" variant="secondary">
            إلغاء
          </LinkButton>
        </div>
      </form>
    </Card>
  );
}
