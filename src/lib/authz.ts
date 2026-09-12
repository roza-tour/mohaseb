// فحص الهوية والصلاحية داخل إجراءات الخادم (Server Actions).
//
// حارس الدخول في proxy.ts يحمي كل المسارات، لكن الاعتماد عليه وحده يعني أن أي
// تعديل مستقبلي فيه يفتح كل الإجراءات دفعةً واحدة — فنفحص هنا أيضاً (دفاع بالعمق).
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { withError } from "./formErrors";

export type SessionUser = { email: string; role?: string };

// يتأكد أن هناك مستخدماً مسجّل الدخول، وإلا يحوّله إلى صفحة الدخول
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/login");
  return { email, role: (session!.user as { role?: string }).role };
}

// يتأكد أن المستخدم مدير — للعمليات التي تمسّ سجلات مالية أو إعدادات الوكالة.
// backTo = الصفحة التي تُعرض فيها رسالة الرفض.
export async function requireAdmin(backTo: string): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    redirect(withError(backTo, "هذه العملية متاحة لحساب المدير فقط"));
  }
  return user;
}
