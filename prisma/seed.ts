import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "agence.rozatour@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "RozaTour@2026";

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        name: "مدير الوكالة",
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
      },
    });
    console.log(`تم إنشاء حساب المدير: ${adminEmail} / كلمة المرور: ${adminPassword}`);
    console.log("يرجى تغيير كلمة المرور بعد أول تسجيل دخول من صفحة الإعدادات.");
  } else {
    console.log("حساب المدير موجود مسبقاً، تم التخطي.");
  }

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      agencyName: "وكالة روزا تور السياحية",
      defaultCurrency: "JOD",
      reminderDaysAhead: 7,
    },
  });

  console.log("تم تجهيز الإعدادات الافتراضية.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
