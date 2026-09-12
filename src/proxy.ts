import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth");
  // صفحة التحقق من المستند (رمز QR) عامة بطبيعتها — يفتحها القنصل أو العميل
  // من خارج الوكالة بلا حساب، فلا تمر بفحص تسجيل الدخول.
  const isPublicVerify = req.nextUrl.pathname.startsWith("/verify/");
  // التذكير اليومي يُستدعى من cron برمز CRON_SECRET بلا جلسة، والمسار نفسه
  // يتحقق من الرمز — فلو حجبناه هنا لما عمل التذكير التلقائي أبداً.
  const isCronReminder = req.nextUrl.pathname === "/api/reminders/email";

  if (isApiAuth || isPublicVerify || isCronReminder) return NextResponse.next();

  if (!isLoggedIn && !isLoginPage) {
    const url = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads).*)"],
};
