"use client";

import { useState } from "react";

// زر «أرسل تذكيراً الآن» — يستدعي نقطة النهاية ويعرض النتيجة
export function SendReminderButton() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const send = async () => {
    setState("sending");
    setMsg("");
    try {
      const res = await fetch("/api/reminders/email");
      const data = await res.json();
      if (data.ok) {
        setState("done");
        setMsg(data.to ? `أُرسل إلى ${data.to}` : "تم الإرسال");
      } else {
        setState("error");
        setMsg(data.error || "تعذّر الإرسال");
      }
    } catch {
      setState("error");
      setMsg("تعذّر الاتصال بالخادم");
    }
  };

  return (
    <div className="flex items-center gap-2">
      {msg && (
        <span className={`text-xs ${state === "error" ? "text-red-600" : "text-emerald-600"}`}>{msg}</span>
      )}
      <button
        onClick={send}
        disabled={state === "sending"}
        className="text-xs rounded-lg bg-slate-100 text-slate-700 px-3 py-1.5 hover:bg-slate-200 disabled:opacity-50"
        title="إرسال ملخّص الرحلات القادمة والمستحقات إلى بريد الوكالة"
      >
        {state === "sending" ? "⏳ جارٍ الإرسال..." : "✉️ أرسل تذكيراً الآن"}
      </button>
    </div>
  );
}
