import { PageHeader } from "@/components/ui";
import { createOpeningBalanceItem } from "../actions";
import { OpeningBalanceForm } from "../OpeningBalanceForm";

export default async function NewOpeningBalanceItemPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const yearParam = Array.isArray(params.year) ? params.year[0] : params.year;
  const year = yearParam ? parseInt(yearParam, 10) : currentYear;
  const safeYear = Number.isFinite(year) ? year : currentYear;

  return (
    <div>
      <PageHeader title="إضافة بند للميزانية الافتتاحية" description="إدخال بند أصول أو التزامات أو حقوق ملكية" />

      <OpeningBalanceForm
        action={createOpeningBalanceItem}
        initial={{ fiscalYear: safeYear, itemType: "ASSET", itemName: "", amount: "", notes: "" }}
      />
    </div>
  );
}
