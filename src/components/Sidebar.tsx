"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV_GROUPS: { title: string; items: { href: string; label: string; icon: string }[] }[] = [
  {
    title: "عام",
    items: [
      { href: "/", label: "لوحة التحكم", icon: "🏠" },
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
      { href: "/task-orders", label: "أوامر التكليف", icon: "📝" },
      { href: "/settings", label: "الإعدادات", icon: "⚙️" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="no-print w-64 shrink-0 bg-slate-900 text-slate-200 min-h-screen flex flex-col">
      <div className="p-4 border-b border-slate-800 flex items-center gap-2">
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
                  className={`flex items-center gap-2 px-4 py-2 text-sm transition ${
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
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-sm text-slate-300 hover:text-white flex items-center gap-2"
        >
          🚪 تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
