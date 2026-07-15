import { Field, Input, Select } from "@/components/ui";
import type { DocumentStyle } from "@/lib/documents";

// عناصر تحكم التنسيق المشتركة بين نموذج المستند ونموذج القالب.
// تُقرأ في الخادم عبر docStyleFromForm — أسماء الحقول ثابتة styleXxx.
export function StyleFields({ style }: { style: DocumentStyle }) {
  return (
    <details className="rounded-lg border border-slate-200 bg-slate-50 open:bg-white">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700 select-none">
        ⚙️ خيارات التنسيق (حجم الخط، الألوان، الإطار...)
      </summary>
      <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Field label="حجم الخط">
          <Input
            type="number"
            name="styleFontSize"
            min={8}
            max={22}
            step={0.5}
            defaultValue={style.fontSize}
          />
        </Field>
        <Field label="تباعد الأسطر">
          <Select name="styleLineHeight" defaultValue={String(style.lineHeight)}>
            <option value="1.4">متقارب (1.4)</option>
            <option value="1.7">عادي (1.7)</option>
            <option value="2">واسع (2.0)</option>
            <option value="2.3">واسع جداً (2.3)</option>
          </Select>
        </Field>
        <Field label="محاذاة الفقرات">
          <Select name="styleAlign" defaultValue={style.align}>
            <option value="right">طبيعية (يمين للعربية، يسار للإنجليزية)</option>
            <option value="center">توسيط</option>
          </Select>
        </Field>
        <Field label="لون النص">
          <Input
            type="color"
            name="styleTextColor"
            defaultValue={style.textColor}
            className="h-10 w-20 p-1 cursor-pointer"
          />
        </Field>
        <Field label="لون العناوين والحدود">
          <Input
            type="color"
            name="styleAccentColor"
            defaultValue={style.accentColor}
            className="h-10 w-20 p-1 cursor-pointer"
          />
        </Field>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="styleBodyBorder" defaultChecked={style.bodyBorder} />
            إطار حول نص المستند
          </label>
        </div>
        <p className="col-span-2 sm:col-span-3 text-xs text-slate-500">
          تنسيقات داخل النص: ابدأ السطر بـ <code dir="ltr" className="text-sky-700"># </code> لعنوان فرعي كبير،
          و<code dir="ltr" className="text-sky-700">## </code> لعنوان أصغر، واكتب{" "}
          <code dir="ltr" className="text-sky-700">---</code> وحدها في سطر لخط فاصل.
        </p>
      </div>
    </details>
  );
}
