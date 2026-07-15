// استبدال متغيرات قوالب المستندات بقيم فعلية من الرحلة والعميل والإعدادات.
// المتغيرات بأقواس مربعة لاتينية حتى تبقى واضحة داخل النص العربي.
import type { Customer, Settings, TourProgram, Trip } from "@prisma/client";

export const TEMPLATE_VARIABLES: { token: string; label: string }[] = [
  { token: "[CLIENT]", label: "اسم العميل" },
  { token: "[PROGRAM]", label: "اسم البرنامج السياحي" },
  { token: "[START_DATE]", label: "تاريخ بداية الرحلة" },
  { token: "[END_DATE]", label: "تاريخ نهاية الرحلة" },
  { token: "[DURATION]", label: "مدة البرنامج بالأيام" },
  { token: "[PAX]", label: "عدد الأشخاص" },
  { token: "[TODAY]", label: "تاريخ اليوم" },
  { token: "[AGENCY]", label: "اسم الوكالة" },
];

function fmt(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

export function fillTemplate(
  body: string,
  ctx: {
    trip?: (Trip & { program: TourProgram; customer: Customer }) | null;
    customer?: Customer | null;
    settings?: Settings | null;
  }
): string {
  const customer = ctx.customer ?? ctx.trip?.customer ?? null;
  const replacements: Record<string, string> = {
    "[CLIENT]": customer?.name ?? "[CLIENT]",
    "[PROGRAM]": ctx.trip?.program.name ?? "[PROGRAM]",
    "[START_DATE]": ctx.trip ? fmt(ctx.trip.startDate) : "[START_DATE]",
    "[END_DATE]": ctx.trip ? fmt(ctx.trip.endDate) : "[END_DATE]",
    "[DURATION]": ctx.trip ? String(ctx.trip.program.durationDays) : "[DURATION]",
    "[PAX]": ctx.trip ? String(ctx.trip.numPax) : "[PAX]",
    "[TODAY]": fmt(new Date()),
    "[AGENCY]": ctx.settings?.agencyName ?? "[AGENCY]",
  };

  let result = body;
  for (const [token, value] of Object.entries(replacements)) {
    result = result.split(token).join(value);
  }
  return result;
}

// رقم تسلسلي للمستند بصيغة السنة/العدّاد، مثال: 2026/0007
export function buildDocNumber(year: number, count: number) {
  return `${year}/${String(count + 1).padStart(4, "0")}`;
}
