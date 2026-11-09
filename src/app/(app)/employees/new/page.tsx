import { PageHeader, Card, LinkButton, Button } from "@/components/ui";
import { createEmployee } from "../actions";
import { EmployeeFields } from "../EmployeeFields";

export default function NewEmployeePage() {
  return (
    <div>
      <PageHeader title="إضافة موظف" description="كل الخانات اختيارية — تُستعمل في شهادة العمل" />
      <Card className="p-5 max-w-3xl">
        <form action={createEmployee} className="space-y-4">
          <EmployeeFields />
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit">حفظ</Button>
            <LinkButton href="/employees" variant="secondary">
              إلغاء
            </LinkButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
