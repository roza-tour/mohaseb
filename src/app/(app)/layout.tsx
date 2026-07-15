import Sidebar from "@/components/Sidebar";
import ReminderBell from "@/components/ReminderBell";
import { auth } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="no-print h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
          <div />
          <div className="flex items-center gap-4">
            <ReminderBell />
            <span className="text-sm text-slate-600">{session?.user?.name}</span>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
