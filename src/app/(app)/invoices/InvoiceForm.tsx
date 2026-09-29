import { Card, Field, Select, Input, Textarea, Button, LinkButton } from "@/components/ui";
import { formatDate, formatDateForInput } from "@/lib/format";
import { ItemsEditor } from "./ItemsEditor";
import { CURRENCIES } from "@/lib/currencies";

export type InvoiceInitial = {
  tripId: string;
  customerId: string;
  docDate: string;
  currency: string;
  items: { description: string; qty: string; unitPrice: string }[];
  discount: number;
  purchasedItem: string;
  branchId: string;
  bankDetails: string;
  notes: string;
  showStamp: boolean;
};

// نموذج الفاتورة المشترك بين الإنشاء والتعديل
export function InvoiceForm({
  action,
  trips,
  customers,
  branches,
  initial,
  submitLabel = "إصدار الفاتورة (PDF)",
}: {
  action: (formData: FormData) => void;
  trips: { id: string; customerId: string | null; startDate: Date; programName: string; customerName: string }[];
  customers: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  initial: InvoiceInitial;
  submitLabel?: string;
}) {
  return (
    <Card className="p-5 max-w-3xl">
      <form action={action} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="الرحلة (اختياري)">
            <Select name="tripId" defaultValue={initial.tripId}>
              <option value="">بدون ربط برحلة</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.programName} — {t.customerName} — {formatDate(t.startDate)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="العميل">
            <Select name="customerId" defaultValue={initial.customerId}>
              <option value="">بدون عميل</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="تاريخ الفاتورة">
            <Input type="date" name="docDate" defaultValue={initial.docDate || formatDateForInput(new Date())} />
          </Field>
          <Field label="العملة">
            <Select name="currency" defaultValue={initial.currency}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          {/* الفرع الذي اشتُريت منه الخدمة — الفاتورة تبقى كما هي، ويُذكَر الفرع فيها فقط */}
          {branches.length > 0 ? (
            <Field label="الفرع (اختياري)">
              <Select name="branchId" defaultValue={initial.branchId}>
                <option value="">بدون فرع</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
        </div>

        <Field label="بنود الفاتورة">
          <ItemsEditor currency={initial.currency} initial={initial.items} />
        </Field>

        <Field label="الخصم (اختياري)">
          <Input type="number" name="discount" min={0} step="0.01" defaultValue={initial.discount} />
        </Field>

        {/* يظهر كمربّع مستقل في الفاتورة قبل الملاحظات — اتركه فارغاً فلا يظهر */}
        <Field label="البرنامج أو الخدمة المشتراة (اختياري)">
          <Textarea
            name="purchasedItem"
            rows={3}
            defaultValue={initial.purchasedItem}
            placeholder="مثال: برنامج جولة الصحراء — تمنراست، 8 أيام / 7 ليالٍ، شامل الإقامة والنقل والمرشد"
          />
        </Field>

        {/* الحساب المحوَّل إليه — يظهر في الفاتورة إن كُتب، ويختفي إن تُرك فارغاً */}
        <Field label="الحساب المحوَّل إليه (اختياري — اتركه فارغاً لو الدفع كاش)">
          <Textarea
            name="bankDetails"
            rows={4}
            defaultValue={initial.bankDetails}
            placeholder={"اسم البنك: ...\nاسم صاحب الحساب: ...\nرقم الحساب / RIB: ...\nIBAN: ..."}
          />
        </Field>

        <Field label="ملاحظات تظهر أسفل الفاتورة (اختياري)">
          <Input name="notes" defaultValue={initial.notes} placeholder="مثال: تُدفع خلال 7 أيام من تاريخ الإصدار" />
        </Field>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="showStamp" defaultChecked={initial.showStamp} />
          إظهار ختم الوكالة على الفاتورة
        </label>

        <div className="flex items-center gap-2">
          <Button type="submit">{submitLabel}</Button>
          <LinkButton href="/invoices" variant="secondary">
            إلغاء
          </LinkButton>
        </div>
      </form>
    </Card>
  );
}
