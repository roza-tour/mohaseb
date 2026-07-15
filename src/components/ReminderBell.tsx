"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

type UpcomingTrip = {
  id: string;
  programName: string;
  customerName: string;
  startDate: string;
  daysRemaining: number;
  status: string;
};

export default function ReminderBell() {
  const [trips, setTrips] = useState<UpcomingTrip[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/reminders");
        if (!res.ok) return;
        const data = await res.json();
        setTrips(data.trips ?? []);
      } catch {
        // silent fail, will retry on next interval
      }
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative text-xl"
        aria-label="التنبيهات"
      >
        🔔
        {trips.length > 0 && (
          <span className="absolute -top-1 -left-1 bg-red-600 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
            {trips.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 max-h-96 overflow-y-auto z-20">
          <div className="p-3 border-b font-semibold text-sm text-slate-700">
            رحلات قادمة قريباً
          </div>
          {trips.length === 0 ? (
            <p className="p-4 text-sm text-slate-400 text-center">لا توجد تنبيهات حالياً</p>
          ) : (
            trips.map((t) => (
              <Link
                key={t.id}
                href={`/trips/${t.id}`}
                className="block p-3 border-b last:border-0 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                <p className="text-sm font-medium text-slate-800">{t.programName}</p>
                <p className="text-xs text-slate-500">{t.customerName}</p>
                <p className="text-xs text-sky-600 mt-1">
                  {t.daysRemaining <= 0
                    ? "يبدأ اليوم!"
                    : `يبدأ خلال ${t.daysRemaining} يوم`}{" "}
                  — {new Date(t.startDate).toLocaleDateString("ar-EG")}
                </p>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
