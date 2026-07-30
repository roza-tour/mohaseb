import { Card, Field, Input, Textarea, Select, Button, LinkButton } from "@/components/ui";
import { TravelersEditor, type Traveler } from "./TravelersEditor";

const CURRENCIES = ["USD", "EUR", "DZD", "TND", "MAD", "SAR"];

export type VisaInitial = {
  wilaya: string;
  wilayasConcernees: string;
  arrivalDate: string;
  departureDate: string;
  programDetail: string;
  feePerPerson: number;
  feeCurrency: string;
  notes: string;
  travelers: Array<Partial<Traveler>>;
};

// حقول ملف الفيزا المشتركة بين الإنشاء والتعديل
export function VisaFields({
  action,
  initial,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  initial: VisaInitial;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-6">
      <Card className="p-5 space-y-4">
        <h2 className="font-bold text-slate-800">بيانات الملف</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="الولاية الموجه إليها الملف (Wilaya de...)">
            <Input name="wilaya" dir="ltr" defaultValue={initial.wilaya} placeholder="Tamanrasset" />
          </Field>
          <Field label="الولايات المعنية بالبرنامج (Wilayas concernées)">
            <Input
              name="wilayasConcernees"
              dir="ltr"
              defaultValue={initial.wilayasConcernees}
              placeholder="Tamanrasset, Djanet, Illizi"
            />
          </Field>
          <Field label="تاريخ الوصول" required>
            <Input type="date" name="arrivalDate" required defaultValue={initial.arrivalDate} />
          </Field>
          <Field label="تاريخ المغادرة" required>
            <Input type="date" name="departureDate" required defaultValue={initial.departureDate} />
          </Field>
        </div>

        <Field label="تفاصيل البرنامج يوماً بيوم (تُملأ في ملف الوورد الرسمي — يفضل بالفرنسية)">
          <Textarea
            name="programDetail"
            rows={8}
            defaultValue={initial.programDetail}
            placeholder={"Jour 1 : Arrivée à l'aéroport de Tamanrasset, accueil et transfert à l'hôtel...\nJour 2 : ..."}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="رسم الخدمة لكل مسافر (يُسجَّل كإيراد تلقائياً)">
            <Input type="number" name="feePerPerson" min={0} step="0.01" defaultValue={initial.feePerPerson} />
          </Field>
          <Field label="عملة الرسم">
            <Select name="feeCurrency" defaultValue={initial.feeCurrency}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="ملاحظات داخلية (لا تظهر في الملفات)">
          <Input name="notes" defaultValue={initial.notes} />
        </Field>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-bold text-slate-800">المسافرون</h2>
        <p className="text-xs text-slate-500">
          📷 زر «مسح الجواز» يقرأ صورة الجواز (السطرين أسفل الصفحة) ويملأ الاسم واللقب ورقم الجواز والجنسية
          وتاريخ الميلاد وتاريخ الانتهاء تلقائياً — القراءة تتم داخل متصفحك ولا تُرفع الصورة لأي مكان.
        </p>
        <TravelersEditor initial={initial.travelers} />
      </Card>

      <div className="flex items-center gap-2">
        <Button type="submit">{submitLabel}</Button>
        <LinkButton href="/visa" variant="secondary">
          إلغاء
        </LinkButton>
      </div>
    </form>
  );
}
