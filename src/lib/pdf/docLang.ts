// اختيار لغة المستند من الرابط (?lang=ar|fr|en) مع لغة افتراضية لكل نوع مستند.
export type Lang = "ar" | "fr" | "en";

export function pickLang(url: string, def: Lang): Lang {
  const v = new URL(url).searchParams.get("lang");
  return v === "fr" || v === "ar" || v === "en" ? v : def;
}

// اتجاه الكتابة حسب اللغة (العربية من اليمين، الفرنسية والإنجليزية من اليسار)
export function dirStyles(lang: Lang) {
  const rtl = lang === "ar";
  return {
    rtl,
    row: rtl ? ("row-reverse" as const) : ("row" as const),
    align: rtl ? ("right" as const) : ("left" as const),
  };
}
