import { prisma } from "@/lib/prisma";
import { PageHeader, ErrorBanner } from "@/components/ui";
import { createInvitation } from "../actions";
import { InvitationForm } from "../InvitationForm";
import type { CustomerOpt } from "../PeopleEditor";

export default async function NewInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;

  const [customers, programs] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.tourProgram.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const customerOpts: CustomerOpt[] = customers.map((c) => ({
    id: c.id,
    name: c.name,
    passport: c.passport ?? "",
    companions: Array.isArray(c.companions)
      ? (c.companions as { name: string; passport: string }[])
      : [],
  }));

  return (
    <div>
      <PageHeader title="دعوة جديدة" description="طلب موافقة على تأشيرة موجَّه لقنصلية لعدة أشخاص — يصدر PDF مختوم بورقتين ويُسجَّل رسمه كإيراد" />
      <ErrorBanner message={sp.error} />

      <InvitationForm action={createInvitation} customers={customerOpts} programs={programs} />
    </div>
  );
}
