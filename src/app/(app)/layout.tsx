import AppShell from "@/components/AppShell";
import { auth } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return <AppShell userName={session?.user?.name}>{children}</AppShell>;
}
