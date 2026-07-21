"use client";

// هيكل التطبيق المتجاوب: قائمة جانبية ثابتة على الشاشات الكبيرة،
// وقائمة منسدلة (drawer) بزر ☰ على الهواتف والأجهزة اللوحية.
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import ReminderBell from "@/components/ReminderBell";

const NAV_GROUPS: { title: string; items: { href: string; label: string; icon: string }[] }[] = [
  {
    title: "عام",
    items: [
      { href: "/", label: "لوحة التحكم", icon: "🏠" },
      { href: "/schedule", label: "جدول المهام", icon: "📅" },
      { href: "/trip-suggestions", label: "اقتراح رحلة وتسعير", icon: "🧮" },
    ],
  },
  {
    title: "الحجوزات",
    items: [
      { href: "/trips", label: "الرحلات", icon: "🧳" },
      { href: "/programs", label: "البرامج السياحية", icon: "🗺️" },
    ],
  },
  {
    title: "قواعد البيانات",
    items: [
      { href: "/customers", label: "العملاء", icon: "👤" },
      { href: "/hotels", label: "الفنادق", icon: "🏨" },
      { href: "/guides", label: "المرشدون", icon: "🧭" },
      { href: "/drivers", label: "السائقون", icon: "🚗" },
    ],
  },
  {
    title: "المحاسبة",
    items: [
      { href: "/accounting/transactions", label: "القيود المحاسبية", icon: "📒" },
      { href: "/accounting/opening-balance", label: "الميزانية الافتتاحية", icon: "📂" },
      { href: "/accounting/closing-summary", label: "الميزانية الختامية المجملة", icon: "📊" },
      { href: "/accounting/closing-detailed", label: "الميزانية الختامية المفصلة", icon: "📑" },
    ],
  },
  {
    title: "المستندات والمهام",
    items: [
      { href: "/documents", label: "المستندات الصادرة", icon: "📄" },
      { href: "/invoices", label: "الفواتير", icon: "🧾" },
      { href: "/task-orders", label: "أوامر التكليف", icon: "📝" },
      { href: "/invitations", label: "الدعوات", icon: "✉️" },
      { href: "/visa", label: "الفيزا الصحراوية", icon: "🛂" },
      { href: "/settings", label: "الإعدادات", icon: "⚙️" },
    ],
  },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="h-full w-72 lg:w-64 bg-slate-900 text-slate-200 flex flex-col">
      <div className="p-4 border-b border-slate-800 flex items-center gap-2 shrink-0">
        <div className="h-9 w-9 rounded-full bg-sky-600 flex items-center justify-center font-bold text-white">
          ر
        </div>
        <div>
          <p className="font-bold text-white text-sm leading-tight">روزا تور</p>
          <p className="text-xs text-slate-400">نظام المحاسبة</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-4">
            <p className="px-4 text-xs font-semibold text-slate-500 mb-1">{group.title}</p>
            {group.items.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm transition ${
                    active
                      ? "bg-sky-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-800 shrink-0">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-sm text-slate-300 hover:text-white flex items-center gap-2"
        >
          🚪 تسجيل الخروج
        </button>
      </div>
    </div>
  );
}

export default function AppShell({
  userName,
  children,
}: {
  userName?: string | null;
  children: React.ReactNode;
}) {
  // روابط القائمة المنسدلة تغلقها بنفسها عبر onNavigate
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* القائمة الجانبية الثابتة — شاشات كبيرة فقط */}
      <aside className="no-print hidden lg:block shrink-0 sticky top-0 h-screen">
        <SidebarNav />
      </aside>

      {/* القائمة المنسدلة — هواتف وأجهزة لوحية */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 right-0 shadow-2xl">
            <SidebarNav onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="no-print h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
          <button
            className="lg:hidden text-2xl text-slate-600 hover:text-slate-900 px-1"
            onClick={() => setOpen(true)}
            aria-label="فتح القائمة"
          >
            ☰
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3 sm:gap-4">
            <ReminderBell />
            <span className="text-sm text-slate-600 truncate max-w-32 sm:max-w-none">{userName}</span>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
