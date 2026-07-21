"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withError } from "@/lib/formErrors";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// حفظ البرامج المحددة من معاينة الاستيراد — الحقول مفهرسة inc_0 / name_0 / ...
export async function importPrograms(formData: FormData) {
  if (!(await auth())?.user?.email) redirect("/login");
  let saved = 0;
  let skipped = 0;

  for (let i = 0; formData.has(`name_${i}`); i++) {
    if (formData.get(`inc_${i}`) !== "on") continue;

    const name = String(formData.get(`name_${i}`) ?? "").trim();
    if (!name) continue;

    const durationDays = Math.max(parseInt(String(formData.get(`duration_${i}`) ?? "1"), 10) || 1, 1);
    const standardPrice = Math.max(parseFloat(String(formData.get(`price_${i}`) ?? "0")) || 0, 0);
    const currency = String(formData.get(`currency_${i}`) ?? "DZD").trim() || "DZD";
    const description = String(formData.get(`description_${i}`) ?? "").trim() || null;

    // لا نكرر برنامجاً موجوداً بنفس الاسم
    const exists = await prisma.tourProgram.findFirst({ where: { name } });
    if (exists) {
      skipped++;
      continue;
    }

    await prisma.tourProgram.create({
      data: { name, durationDays, standardPrice, currency, description },
    });
    saved++;
  }

  if (saved === 0 && skipped === 0) {
    redirect(withError("/programs/import", "حدد رحلة واحدة على الأقل للاستيراد"));
  }

  revalidatePath("/programs");
  redirect(`/programs?imported=${saved}&skipped=${skipped}`);
}
