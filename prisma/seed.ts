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
      agencyName: "ROZATOUR",
      agencyTagline: "DE-TOURISMES ET-VOYAGES",
      defaultCurrency: "DZD",
      reminderDaysAhead: 7,
    },
  });

  console.log("تم تجهيز الإعدادات الافتراضية.");

  // قوالب مستندات افتراضية — تُنشأ مرة واحدة فقط عند قاعدة فارغة
  // حتى لا تُمسّ تعديلات المستخدم على قوالبه لاحقاً
  const templatesCount = await prisma.documentTemplate.count();
  if (templatesCount === 0) {
    await prisma.documentTemplate.createMany({
      data: [
        {
          name: "دعوة سياحية",
          title: "دعوة سياحية",
          body: [
            "إلى من يهمه الأمر،",
            "",
            "نؤكد نحن وكالة [AGENCY] للسياحة والأسفار، وكالة سياحية مرخصة، أننا سنستضيف وننظم رحلة سياحية خاصة لفائدة السيد/ة [CLIENT].",
            "",
            "برنامج الرحلة: [PROGRAM]",
            "من تاريخ [START_DATE] إلى تاريخ [END_DATE] ([DURATION] أيام)، لعدد [PAX] شخص/أشخاص.",
            "",
            "خلال فترة الإقامة، ستتكفل الوكالة بتوفير وتنسيق الخدمات السياحية بما في ذلك الاستقبال في المطار، الإقامة الفندقية، النقل الخاص، الجولات السياحية المرافقة، والدعم اللوجستي طوال الرحلة.",
            "",
            "وتفضلوا بقبول فائق الاحترام والتقدير.",
            "",
            "حرر بتاريخ [TODAY]",
          ].join("\n"),
        },
        {
          name: "تصريح بالعمل",
          title: "تصريح بالعمل",
          body: [
            "نصرح نحن وكالة [AGENCY] للسياحة والأسفار بأن حامل هذا التصريح مكلف بالعمل لدى وكالتنا في إطار تنفيذ البرنامج السياحي [PROGRAM] خلال الفترة الممتدة من [START_DATE] إلى [END_DATE].",
            "",
            "يُمنح هذا التصريح لاستعماله لدى الجهات المختصة عند الحاجة، وتتحمل الوكالة كامل المسؤولية المتعلقة بمهامه خلال الفترة المذكورة.",
            "",
            "حرر بتاريخ [TODAY]",
          ].join("\n"),
        },
        {
          name: "تأكيد حجز",
          title: "تأكيد حجز",
          body: [
            "تحية طيبة وبعد،",
            "",
            "نؤكد لكم حجز السيد/ة [CLIENT] في البرنامج السياحي [PROGRAM] من تاريخ [START_DATE] إلى تاريخ [END_DATE] لعدد [PAX] شخص/أشخاص.",
            "",
            "يشمل الحجز كل الخدمات المتفق عليها في البرنامج. لأي استفسار يرجى التواصل معنا على بيانات الاتصال المدونة أسفل هذه الوثيقة.",
            "",
            "مع خالص التحيات،",
            "وكالة [AGENCY]",
            "",
            "حرر بتاريخ [TODAY]",
          ].join("\n"),
        },
      ],
    });
    console.log("تم إنشاء قوالب المستندات الافتراضية (دعوة سياحية، تصريح بالعمل، تأكيد حجز).");
  } else {
    console.log("قوالب المستندات موجودة مسبقاً، تم التخطي.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
