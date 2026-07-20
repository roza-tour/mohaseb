import { PageHeader, Card, Field, Input, Button, LinkButton, ErrorBanner } from "@/components/ui";
import { fetchProgramsFromSite, type ImportedProgram } from "@/lib/siteImport";
import { importPrograms } from "./actions";

const DEFAULT_URL =
  "https://rozatour-booking.com/destination/algeria-the-hidden-gem-of-north-africa";

export default async function ImportProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const url = typeof sp.url === "string" && sp.url.trim() !== "" ? sp.url.trim() : "";

  let programs: ImportedProgram[] = [];
  let fetchError = "";
  if (url) {
    try {
      programs = await fetchProgramsFromSite(url);
      if (programs.length === 0) {
        fetchError = "لم أجد رحلات في هذه الصفحة — تأكد أنها صفحة الوجهة الصحيحة على موقعكم";
      }
    } catch (e) {
      fetchError = e instanceof Error ? e.message : "تعذر جلب الصفحة — حاول مجدداً";
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";

  return (
    <div>
      <PageHeader
        title="استيراد الرحلات من الموقع"
        description="اجلب رحلات الجزائر من موقعكم rozatour-booking.com وسجّلها كبرامج سياحية بضغطة واحدة — راجع وعدّل قبل الحفظ"
        action={<LinkButton href="/programs" variant="secondary">→ البرامج</LinkButton>}
      />

      <ErrorBanner message={sp.error} />

      <Card className="p-5 mb-6">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-64">
            <Field label="رابط صفحة الوجهة على موقعكم">
              <Input name="url" dir="ltr" defaultValue={url || DEFAULT_URL} required />
            </Field>
          </div>
          <Button type="submit">جلب الرحلات</Button>
        </form>
        {fetchError && (
          <p className="mt-3 text-sm rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
            ⚠️ {fetchError}
          </p>
        )}
      </Card>

      {programs.length > 0 && (
        <form action={importPrograms}>
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-bold text-slate-800">وجدت {programs.length} رحلة — حدد ما تريد استيراده</h2>
              <p className="text-xs text-slate-500">يمكنك تعديل الاسم والمدة والسعر قبل الحفظ</p>
            </div>

            <div className="space-y-3">
              {programs.map((p, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 col-span-2 sm:col-span-4 lg:col-span-1">
                      <input type="checkbox" name={`inc_${i}`} defaultChecked />
                      استيراد
                    </label>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-0.5">اسم الرحلة</label>
                      <input name={`name_${i}`} defaultValue={p.name} className={inputCls} dir="ltr" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-0.5">المدة (أيام)</label>
                      <input
                        type="number"
                        min={1}
                        name={`duration_${i}`}
                        defaultValue={p.durationDays}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-0.5">السعر المعروض</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        name={`price_${i}`}
                        defaultValue={p.price}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-0.5">العملة</label>
                      <input name={`currency_${i}`} defaultValue={p.currency} className={inputCls} dir="ltr" />
                    </div>
                  </div>
                  <input type="hidden" name={`description_${i}`} value={p.description} />
                  {p.description && (
                    <p className="mt-2 text-xs text-slate-500 line-clamp-2" dir="auto">
                      {p.description}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <Button type="submit">حفظ الرحلات المحددة كبرامج سياحية</Button>
          </Card>
        </form>
      )}
    </div>
  );
}
