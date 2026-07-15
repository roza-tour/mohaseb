import { PageHeader, Card } from "@/components/ui";
import { createTemplate } from "../../actions";
import { TemplateForm } from "../TemplateForm";

export default function NewTemplatePage() {
  return (
    <div>
      <PageHeader title="قالب جديد" description="أنشئ نموذجاً جاهزاً لأي مستند تصدره الوكالة بشكل متكرر" />
      <Card className="p-5 max-w-3xl">
        <TemplateForm action={createTemplate} />
      </Card>
    </div>
  );
}
