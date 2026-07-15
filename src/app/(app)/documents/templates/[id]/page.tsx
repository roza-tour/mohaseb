import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { updateTemplate } from "../../actions";
import { TemplateForm } from "../TemplateForm";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await prisma.documentTemplate.findUnique({ where: { id } });
  if (!template) notFound();

  return (
    <div>
      <PageHeader title="تعديل القالب" description={template.name} />
      <Card className="p-5 max-w-3xl">
        <TemplateForm action={updateTemplate.bind(null, id)} template={template} />
      </Card>
    </div>
  );
}
