import { PageHeader } from "@/components/ui";
import { ProgramForm } from "../ProgramForm";
import { createProgram } from "../actions";

export default function NewProgramPage() {
  return (
    <div>
      <PageHeader title="برنامج سياحي جديد" description="إنشاء قالب برنامج سياحي جديد" />
      <ProgramForm action={createProgram} />
    </div>
  );
}
