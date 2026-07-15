import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Field, Input, Select, Button } from "@/components/ui";
import { updateSettings, changePassword } from "./actions";

export default async function SettingsPage() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  return (
    <div>
      <PageHeader title="الإعدادات" description="بيانات الوكالة والشعار والختم والإعدادات العامة" />

      <form action={updateSettings} encType="multipart/form-data" className="space-y-6">
        <Card className="p-5 space-y-4">
          <h2 className="font-bold text-slate-800">بيانات الوكالة</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="اسم الوكالة">
              <Input name="agencyName" required defaultValue={settings?.agencyName ?? "وكالة روزا تور السياحية"} />
            </Field>
            <Field label="رقم الهاتف">
              <Input name="agencyPhone" defaultValue={settings?.agencyPhone ?? ""} />
            </Field>
            <Field label="البريد الإلكتروني">
              <Input name="agencyEmail" type="email" defaultValue={settings?.agencyEmail ?? ""} />
            </Field>
            <Field label="العنوان">
              <Input name="agencyAddress" defaultValue={settings?.agencyAddress ?? ""} />
            </Field>
            <Field label="العملة الافتراضية">
              <Select name="defaultCurrency" defaultValue={settings?.defaultCurrency ?? "JOD"}>
                <option value="JOD">دينار أردني (JOD)</option>
                <option value="USD">دولار أمريكي (USD)</option>
                <option value="EUR">يورو (EUR)</option>
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="EGP">جنيه مصري (EGP)</option>
              </Select>
            </Field>
            <Field label="عدد الأيام قبل موعد الرحلة لإظهار التنبيه">
              <Input
                name="reminderDaysAhead"
                type="number"
                min={0}
                defaultValue={settings?.reminderDaysAhead ?? 7}
              />
            </Field>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-bold text-slate-800">شعار الوكالة</h2>
          {settings?.logoPath && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logoPath} alt="شعار الوكالة" className="h-16 mb-2 object-contain" />
          )}
          <Input type="file" name="logo" accept="image/*" />
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-bold text-slate-800">ختم الوكالة</h2>
          <p className="text-xs text-slate-500">
            قم برفع صورة الختم مرة واحدة فقط ليتم إدراجها تلقائياً في كل أوامر التكليف الصادرة، دون الحاجة لختم
            الورقة يدوياً كل مرة.
          </p>
          {settings?.stampPath && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.stampPath} alt="ختم الوكالة" className="h-24 mb-2 object-contain" />
          )}
          <Input type="file" name="stamp" accept="image/*" />
        </Card>

        <Button type="submit">حفظ الإعدادات</Button>
      </form>

      <Card className="p-5 space-y-4 mt-6 max-w-lg">
        <h2 className="font-bold text-slate-800">تغيير كلمة المرور</h2>
        <form action={changePassword} className="space-y-4">
          <Field label="كلمة المرور الحالية">
            <Input type="password" name="currentPassword" required />
          </Field>
          <Field label="كلمة المرور الجديدة">
            <Input type="password" name="newPassword" required minLength={8} />
          </Field>
          <Field label="تأكيد كلمة المرور الجديدة">
            <Input type="password" name="confirmPassword" required minLength={8} />
          </Field>
          <Button type="submit" variant="secondary">
            تغيير كلمة المرور
          </Button>
        </form>
      </Card>
    </div>
  );
}
