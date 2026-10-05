"use client";

import { useState } from "react";

// زر «أرسل التذكيرات الآن» — يرسل تذكير كل رحلة حان موعدها ولم يُرسَل لها بعد
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
        setMsg(
          data.sent > 0
            ? `أُرسل تذكير ${data.sent === 1 ? "رحلة واحدة" : `${data.sent} رحلات`} إلى ${data.to}`
            : data.message || "لا توجد رحلات حان تذكيرها الآن"
        );
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
        title="رسالة لكل رحلة قادمة حان تذكيرها ولم يُرسَل لها تذكير بعد"
      >
        {state === "sending" ? "⏳ جارٍ الإرسال..." : "✉️ أرسل التذكيرات الآن"}
      </button>
    </div>
  );
}
