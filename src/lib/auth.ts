import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// حماية من تخمين كلمات المرور: بعد 5 محاولات فاشلة لنفس البريد
// يُقفل الدخول 10 دقائق. العدّاد في قاعدة البيانات لا في الذاكرة، حتى لا
// يُصفَّر عند كل إعادة تشغيل للتطبيق (وهي كثيرة على الاستضافة المشتركة).
const MAX_ATTEMPTS = 5;
const LOCK_MS = 10 * 60 * 1000;

async function isLocked(email: string): Promise<boolean> {
  try {
    const rec = await prisma.loginAttempt.findUnique({ where: { email } });
    return !!rec?.lockedUntil && rec.lockedUntil.getTime() > Date.now();
  } catch {
    // تعذّر الوصول للجدول (هجرة لم تُطبَّق بعد) — لا نمنع الدخول
    return false;
  }
}

async function recordFailure(email: string) {
  try {
    const rec = await prisma.loginAttempt.findUnique({ where: { email } });
    const count = (rec?.count ?? 0) + 1;
    const locked = count >= MAX_ATTEMPTS;
    await prisma.loginAttempt.upsert({
      where: { email },
      create: {
        email,
        count: locked ? 0 : count,
        lockedUntil: locked ? new Date(Date.now() + LOCK_MS) : null,
      },
      update: {
        count: locked ? 0 : count,
        lockedUntil: locked ? new Date(Date.now() + LOCK_MS) : rec?.lockedUntil ?? null,
      },
    });
  } catch {
    /* نتجاهل — لا نمنع تسجيل الدخول بسبب فشل التسجيل */
  }
}

async function recordSuccess(email: string) {
  try {
    await prisma.loginAttempt.deleteMany({ where: { email } });
  } catch {
    /* نتجاهل */
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // مطلوب عند التشغيل خلف Passenger/بروكسي في الاستضافة المشتركة (cPanel)
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "البريد الإلكتروني", type: "email" },
        password: { label: "كلمة المرور", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        if (await isLocked(email)) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          await recordFailure(email);
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          await recordFailure(email);
          return null;
        }

        await recordSuccess(email);
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string | undefined;
      }
      return session;
    },
  },
});
