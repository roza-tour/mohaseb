import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Field, Input, Select, LinkButton, Button, SuccessBanner } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { formatDateForInput } from "@/lib/format";
import { updateEmployee, deleteEmployee, issueWorkCertificate } from "../actions";
import { EmployeeFields } from "../EmployeeFields";
import { SignerPicker } from "../SignerPicker";

export default async function EditEmployeePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const [emp, settings] = await Promise.all([
    prisma.employee.findUnique({ where: { id } }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);
  if (!emp) notFound();

  return (
    <div>
      <PageHeader title={emp.name || "موظف"} description="بيانات الموظف وإصدار شهادة العمل" />
      {sp.saved && <SuccessBanner message="تم حفظ بيانات الموظف" />}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
        <Card className="p-5">
          <h2 className="font-semibold text-slate-800 mb-4">بيانات الموظف</h2>
          <form action={updateEmployee.bind(null, id)} className="space-y-4">
            <EmployeeFields e={emp} />
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit">حفظ التعديلات</Button>
              <LinkButton href="/employees" variant="secondary">
                رجوع
              </LinkButton>
            </div>
          </form>
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
            <DeleteButton action={deleteEmployee.bind(null, id)} label="حذف الموظف" />
          </div>
        </Card>

        <div id="certificate">
          <Card className="p-5">
            <h2 className="font-semibold text-slate-800 mb-1">📜 إصدار شهادة عمل</h2>
            <p className="text-xs text-slate-500 mb-4">
              تُكتب الشهادة تلقائياً من بيانات الموظف (احفظ التعديلات أولاً)، وتُسجَّل في المستندات الصادرة برقم تسلسلي
              وختم ورمز QR للتحقق — ويمكن تعديل نصها بعد الإصدار من صفحة المستندات.
            </p>
            <form action={issueWorkCertificate.bind(null, id)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="لغة الشهادة">
                  <Select name="lang" defaultValue="fr">
                    <option value="fr">الفرنسية (Attestation de travail)</option>
                    <option value="ar">العربية (شهادة عمل)</option>
                  </Select>
                </Field>
                <Field label="تاريخ الشهادة">
                  <Input type="date" name="docDate" defaultValue={formatDateForInput(new Date())} />
                </Field>
                <Field label="اسم الموقّع (اختياري)">
                  <Input
                    name="signerName"
                    defaultValue={settings?.managerName ?? ""}
                    placeholder="مثال: اسم مالكة الوكالة"
                  />
                </Field>
                <SignerPicker initial={settings?.managerTitle ?? ""} />
                <Field label="مدينة التحرير (اختياري)">
                  <Input name="city" defaultValue={settings?.agencyCity ?? ""} placeholder="مثال: جانت / Djanet" />
                </Field>
                <label className="flex items-center gap-2 text-sm text-slate-700 sm:pt-7">
                  <input type="checkbox" name="showStamp" defaultChecked />
                  إظهار الختم
                </label>
              </div>
              <Button type="submit">إصدار الشهادة (PDF)</Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
