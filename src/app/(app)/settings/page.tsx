import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Field, Input, Select, Button, ErrorBanner, SuccessBanner } from "@/components/ui";
import { updateSettings, changePassword, updateCleanupSettings, runCleanupNow } from "./actions";
import { previewCleanup } from "@/lib/tripCleanup";
import { formatDate } from "@/lib/format";
import { StyleFields } from "../documents/StyleFields";
import { settingsDocStyle } from "@/lib/documents";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const cleanupDays = settings?.autoCleanupDaysAfter ?? 90;
  // كم سيُحذف لو شُغّل التنظيف الآن — يُعرض قبل التفعيل حتى لا يفاجئك الحذف
  const pending = await previewCleanup(cleanupDays);
  const cleaned = typeof sp.cleaned === "string" ? sp.cleaned.split("-") : null;

  return (
    <div>
      <PageHeader
        title="الإعدادات"
        description="بيانات الوكالة والشعار والختم والإعدادات العامة"
        action={
          <a
            href="/settings/users"
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            👥 إدارة المستخدمين
          </a>
        }
      />

      {sp.saved && <SuccessBanner message="تم حفظ الإعدادات" />}
      {cleaned && (
        <SuccessBanner
          message={`تم التنظيف: حُذفت ${cleaned[0]} رحلة و${cleaned[1]} أمر تكليف`}
        />
      )}
      <ErrorBanner message={sp.error} />

      <form action={updateSettings} encType="multipart/form-data" className="space-y-6">
        <Card className="p-5 space-y-4">
          <h2 className="font-bold text-slate-800">بيانات الوكالة</h2>
          <p className="text-xs text-slate-500">
            تظهر هذه البيانات تلقائياً على كل مستندات PDF الصادرة من النظام: الشعار أعلى الصفحة، والعنوان
            وأرقام الهواتف والبريد والموقع الإلكتروني في تذييل أنيق أسفل كل صفحة — أدخلها مرة واحدة فقط.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="اسم الوكالة (يظهر بخط كبير في ترويسة المستندات)">
              <Input name="agencyName" defaultValue={settings?.agencyName ?? "ROZATOUR"} />
            </Field>
            <Field label="السطر الفرعي تحت الاسم (اختياري)">
              <Input
                name="agencyTagline"
                placeholder="مثال: DE-TOURISMES ET-VOYAGES"
                defaultValue={settings?.agencyTagline ?? ""}
              />
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
            <Field label="الموقع الإلكتروني">
              <Input name="agencyWebsite" dir="ltr" placeholder="www.example.com" defaultValue={settings?.agencyWebsite ?? ""} />
            </Field>
            <Field label="رقم السجل التجاري N° RC (يظهر في ملفات الفيزا الصحراوية)">
              <Input name="agencyRC" dir="ltr" defaultValue={settings?.agencyRC ?? ""} />
            </Field>
            <Field label="العملة الافتراضية">
              <Select name="defaultCurrency" defaultValue={settings?.defaultCurrency ?? "DZD"}>
                <option value="DZD">دينار جزائري (DZD)</option>
                <option value="EUR">يورو (EUR)</option>
                <option value="USD">دولار أمريكي (USD)</option>
                <option value="TND">دينار تونسي (TND)</option>
                <option value="MAD">درهم مغربي (MAD)</option>
                <option value="SAR">ريال سعودي (SAR)</option>
              </Select>
            </Field>
            <Field label="لون ترويسة المستندات (الاسم والشريط في ورق الشركة)">
              <Input
                type="color"
                name="letterheadColor"
                defaultValue={settings?.letterheadColor ?? "#1f3864"}
                className="h-10 w-24 p-1 cursor-pointer"
              />
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

        <Card className="p-5 space-y-3">
          <h2 className="font-bold text-slate-800">تنسيق المستندات</h2>
          <p className="text-xs text-slate-500">
            يسري هذا التنسيق على كل المستندات المولَّدة: الفواتير، الدعوات، أوامر التكليف، سندات القبض،
            والمستندات الصادرة. (يمكن لأي مستند حرّ أن يخالفه بتنسيق خاص به من صفحته.)
          </p>
          <StyleFields style={settingsDocStyle(settings)} />
        </Card>

        <Button type="submit">حفظ الإعدادات</Button>
      </form>

      <Card className="p-5 space-y-3 mt-6 max-w-lg">
        <h2 className="font-bold text-slate-800">النسخ الاحتياطي</h2>
        <p className="text-xs text-slate-500">
          حمّل نسخة كاملة من قاعدة البيانات (ملف SQL يمكن استعادته من phpMyAdmin). ننصح بأخذ نسخة
          أسبوعياً على الأقل وحفظها خارج السيرفر. لا تنسَ أيضاً نسخ مجلد <code dir="ltr">public/uploads</code>
          {" "}(الشعار والختم) من مدير الملفات.
        </p>
        <a
          href="/api/backup"
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition bg-sky-600 text-white hover:bg-sky-700 w-fit"
        >
          ⬇️ تحميل نسخة احتياطية الآن
        </a>
      </Card>

      <Card className="p-5 space-y-4 mt-6 max-w-lg">
        <h2 className="font-bold text-slate-800">التنظيف التلقائي للجداول</h2>
        <p className="text-xs text-slate-500">
          عند تفعيله تُحذف تلقائياً الرحلات التي مضى على انتهائها المدة المحددة، وأوامر التكليف التي
          مضى على تاريخ مهمتها نفس المدة — فتبقى الجداول مقتصرة على العمل الجاري.
          <br />
          <b className="text-slate-700">ماذا يبقى:</b> العملاء والمرشدون والسائقون والفنادق والفواتير
          والمستندات الصادرة والقيود المحاسبية. والمبلغ المحصَّل من أي رحلة تُحذف يُسجَّل تلقائياً
          كقيد إيراد حتى لا يختفي من الحسابات.
          <br />
          <b className="text-red-700">الحذف نهائي ولا يمكن التراجع عنه</b> — خذ نسخة احتياطية قبل التفعيل.
        </p>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          لو شُغّل التنظيف الآن بالمدة الحالية ({cleanupDays} يوماً) سيُحذف:{" "}
          <b>{pending.trips}</b> رحلة و<b>{pending.taskOrders}</b> أمر تكليف.
        </div>

        <form action={updateCleanupSettings} className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              id="autoCleanupEnabled"
              name="autoCleanupEnabled"
              defaultChecked={settings?.autoCleanupEnabled ?? false}
            />
            تفعيل التنظيف التلقائي
          </label>
          <Field label="المدة بعد انتهاء الرحلة أو المهمة (بالأيام)">
            <Input
              type="number"
              id="autoCleanupDaysAfter"
              name="autoCleanupDaysAfter"
              min={0}
              max={3650}
              defaultValue={cleanupDays}
            />
          </Field>
          <Button type="submit" variant="secondary">
            حفظ إعدادات التنظيف
          </Button>
        </form>

        <form action={runCleanupNow}>
          <button
            type="submit"
            className="text-sm text-red-600 hover:underline"
          >
            🗑️ تشغيل التنظيف الآن
          </button>
        </form>

        <p className="text-xs text-slate-400">
          {settings?.lastCleanupAt
            ? `آخر تنظيف: ${formatDate(settings.lastCleanupAt)}`
            : "لم يُشغَّل التنظيف بعد."}{" "}
          للتشغيل اليومي التلقائي أضف مهمة cron (سكربت <code dir="ltr">scripts/setup-cron.sh</code> يفعلها عنك).
        </p>
      </Card>

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
