import { Field, Input, Textarea, Button, LinkButton } from "@/components/ui";
import { parseDocStyle, TEMPLATE_VARIABLES } from "@/lib/documents";
import { StyleFields } from "../StyleFields";
import type { DocumentTemplate } from "@prisma/client";

export function TemplateForm({
  action,
  template,
}: {
  action: (formData: FormData) => Promise<void>;
  template?: DocumentTemplate;
}) {
  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="اسم القالب (يظهر في قائمة الاختيار)">
          <Input name="name" required defaultValue={template?.name} placeholder="مثال: دعوة سياحية" />
        </Field>
        <Field label="عنوان المستند (يظهر بخط كبير في الـ PDF)">
          <Input name="title" required defaultValue={template?.title} placeholder="مثال: دعوة سياحية" />
        </Field>
      </div>

      <Field label="نص القالب">
        <Textarea
          name="body"
          required
          rows={14}
          defaultValue={template?.body}
          placeholder={"نشهد نحن وكالة [AGENCY] أن السيد/ة [CLIENT] ...\n\nكل سطر فارغ يبدأ فقرة جديدة في الـ PDF"}
        />
      </Field>

      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
        <p className="text-xs font-medium text-slate-600 mb-1">
          المتغيرات المتاحة — تُستبدل تلقائياً ببيانات الرحلة والعميل عند إنشاء مستند من هذا القالب:
        </p>
        <ul className="text-xs text-slate-500 grid grid-cols-2 gap-x-4">
          {TEMPLATE_VARIABLES.map((v) => (
            <li key={v.token}>
              <code dir="ltr" className="text-sky-700">{v.token}</code> — {v.label}
            </li>
          ))}
        </ul>
      </div>

      <StyleFields style={parseDocStyle(template?.style)} />

      <div className="flex items-center gap-2">
        <Button type="submit">حفظ القالب</Button>
        <LinkButton href="/documents/templates" variant="secondary">
          إلغاء
        </LinkButton>
      </div>
    </form>
  );
}
