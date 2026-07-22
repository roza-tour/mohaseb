// تسجيل نشاط مختصر (من فعل ماذا). لا يفشل الإجراء الأصلي إن تعذّر التسجيل.
import { prisma } from "./prisma";
import { auth } from "./auth";

export async function logActivity(action: string, entity: string, summary = "") {
  try {
    const session = await auth();
    await prisma.activityLog.create({
      data: { userEmail: session?.user?.email ?? "", action, entity, summary: summary.slice(0, 190) },
    });
  } catch {
    /* تجاهل */
  }
}
