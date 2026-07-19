import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// حماية من تخمين كلمات المرور: بعد 5 محاولات فاشلة لنفس البريد
// يُقفل الدخول 10 دقائق. (عدّاد في الذاكرة — يُصفَّر عند إعادة تشغيل التطبيق)
const MAX_ATTEMPTS = 5;
const LOCK_MS = 10 * 60 * 1000;
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();

function isLocked(email: string): boolean {
  const rec = failedAttempts.get(email);
  return !!rec && rec.lockedUntil > Date.now();
}

function recordFailure(email: string) {
  const rec = failedAttempts.get(email) ?? { count: 0, lockedUntil: 0 };
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockedUntil = Date.now() + LOCK_MS;
    rec.count = 0;
  }
  failedAttempts.set(email, rec);
}

function recordSuccess(email: string) {
  failedAttempts.delete(email);
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

        if (isLocked(email)) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          recordFailure(email);
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          recordFailure(email);
          return null;
        }

        recordSuccess(email);
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
