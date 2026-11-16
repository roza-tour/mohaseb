// مكان التحرير والتاريخ: «حُرّر بالمسيلة في 16/11/2026» / «Fait à M'Sila, le 16/11/2026».
// يُرسم سطراً في متن المستند تحت العنوان (PlaceDateLine) — لا أعلى يمين الصفحة،
// لأن ختم الوكالة يُوضع هناك ويغطّيه.
import type { Settings } from "@prisma/client";

export type PlaceLang = "ar" | "fr" | "en";

export function placeDate(settings: Pick<Settings, "cityAr" | "cityFr"> | null, lang: PlaceLang, date: string): string {
  const ar = settings?.cityAr?.trim() ?? "";
  const fr = settings?.cityFr?.trim() ?? "";
  // «ب» + المدينة: بالمسيلة، بولاية المسيلة
  if (lang === "ar") return ar ? `حُرّر ب${ar} في ${date}` : `حُرّر في ${date}`;
  if (lang === "fr") return fr ? `Fait à ${fr}, le ${date}` : `Fait le ${date}`;
  return fr ? `Issued in ${fr} on ${date}` : `Issued on ${date}`;
}
