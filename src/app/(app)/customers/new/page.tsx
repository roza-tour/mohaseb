import { PageHeader, Card } from "@/components/ui";
import { createCustomer } from "../actions";
import { CustomerForm } from "../CustomerForm";

export default function NewCustomerPage() {
  return (
    <div>
      <PageHeader title="إضافة عميل" description="صوّري الجواز لتعبئة الاسم، أو أدخلي البيانات يدوياً — كل الحقول اختيارية" />

      <Card className="p-5 max-w-2xl">
        <CustomerForm action={createCustomer} />
      </Card>
    </div>
  );
}
