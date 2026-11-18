import { Field, Input } from "@/components/ui";
import { SignerPicker } from "./SignerPicker";

// الموقّع على شهادة العمل وبيان الراتب: الصفة والاسم بالعربية والفرنسية (محفوظة من آخر مرة)
export function SignerFields({
  title,
  nameAr,
  nameFr,
}: {
  title: string;
  nameAr: string;
  nameFr: string;
}) {
  return (
    <>
      <SignerPicker initial={title} />
      <Field label="اسم الموقّع بالعربية (للنسخة العربية)">
        <Input name="signerName" defaultValue={nameAr} placeholder="مثال: بن يحي محمد" />
      </Field>
      <Field label="اسم الموقّع بالفرنسية (للنسخة الفرنسية)">
        <Input name="signerNameFr" dir="ltr" defaultValue={nameFr} placeholder="Ex : BENYAHIA Mohamed" />
      </Field>
    </>
  );
}
