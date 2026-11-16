// مكان التحرير والتاريخ في رأس كل مستند: «المسيلة في 16/11/2026» / «M'Sila, le 16/11/2026»
// (بدل التاريخ وحده أعلى الصفحة، وبدل «حُرّر في ...» تحت التوقيع والختم).
import type { Settings } from "@prisma/client";

export type PlaceLang = "ar" | "fr" | "en";

export function placeDate(settings: Pick<Settings, "cityAr" | "cityFr"> | null, lang: PlaceLang, date: string): string {
  const ar = settings?.cityAr?.trim() ?? "";
  const fr = settings?.cityFr?.trim() ?? "";
  if (lang === "ar") return ar ? `${ar} في ${date}` : date;
  if (lang === "fr") return fr ? `${fr}, le ${date}` : date;
  return fr ? `${fr}, ${date}` : date;
}
