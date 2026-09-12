"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // في الإنتاج تُصدَر كوكيز الجلسة بصيغة __Secure- ولا تعمل إلا على HTTPS،
  // فالدخول عبر http يفشل صامتاً — نوضّح السبب بدل ترك المستخدم يظن أن كلمة المرور خاطئة.
  const insecureConnection = () =>
    typeof window !== "undefined" &&
    window.location.protocol === "http:" &&
    !["localhost", "127.0.0.1"].includes(window.location.hostname);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError(
        insecureConnection()
          ? "تعذّر تسجيل الدخول. تفتح الموقع عبر اتصال غير آمن (http) وكوكيز الجلسة لا تعمل إلا على https — افتح الموقع بـ https أو فعّل شهادة SSL من لوحة الاستضافة."
          : "البريد الإلكتروني أو كلمة المرور غير صحيحة"
      );
      return;
    }
    router.push(searchParams.get("callbackUrl") || "/");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-emerald-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-sky-600 text-white flex items-center justify-center text-2xl font-bold">
            ر
          </div>
          <h1 className="text-xl font-bold text-slate-800">نظام محاسبة الوكالة</h1>
          <p className="text-sm text-slate-500 mt-1">سجّل الدخول لإدارة الحجوزات والحسابات</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              id="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">كلمة المرور</label>
            <input
              type="password"
              id="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sky-600 text-white py-2.5 font-medium hover:bg-sky-700 disabled:opacity-60 transition"
          >
            {loading ? "جارٍ الدخول..." : "تسجيل الدخول"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
