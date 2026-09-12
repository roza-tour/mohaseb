// ترقيم المستندات (فواتير، سندات قبض، مستندات صادرة، دعوات، ملفات فيزا).
//
// الطريقة القديمة كانت "عدد مستندات السنة + 1"، وفيها ثلاث مشاكل:
// حذف مستند يعيد استعمال رقمه، ومستندان يُنشآن في نفس اللحظة يأخذان نفس الرقم،
// ومستند بتاريخ قديم يأخذ رقماً خارج التسلسل.
// صار الرقم يؤخذ من جدول عدّاد (Counter) بزيادة ذرّية داخل معاملة، مع قيد تفرّد
// على رقم كل مستند في قاعدة البيانات — فلا يتكرّر رقم أبداً.
import { prisma } from "./prisma";

export type DocKind = "invoice" | "receipt" | "document" | "invitation" | "visa";

function format(year: number, n: number) {
  return `${year}/${String(n).padStart(4, "0")}`;
}

async function bump(kind: DocKind, year: number): Promise<number> {
  const row = await prisma.counter.upsert({
    where: { kind_year: { kind, year } },
    create: { kind, year, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
    select: { lastNumber: true },
  });
  return row.lastNumber;
}

// الرقم التسلسلي التالي لنوع المستند في سنة معيّنة، مثل 2026/0007
export async function nextDocNumber(kind: DocKind, year: number): Promise<string> {
  try {
    return format(year, await bump(kind, year));
  } catch {
    // تسابق نادر عند أول مستند في السنة (محاولتا إنشاء لنفس السطر) — نعيد المحاولة مرة
    return format(year, await bump(kind, year));
  }
}
