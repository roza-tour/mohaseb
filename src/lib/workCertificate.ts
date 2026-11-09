// شهادة العمل (Attestation de travail) بالعربية والفرنسية.
//
// تُحفظ «مستنداً صادراً» من نوع work-certificate: بياناتها المنظَّمة في Document.data
// (تُرسم جدولاً في تصميم خاص)، ونصّها في Document.body ثلاث فقرات يفصلها سطر فارغ
// (المقدمة، الإفادة، الختام) — فيبقى تعديل النص ممكناً من صفحة المستندات.
// كل معلومة غير مكتوبة تُحذف من الجدول والجمل بدل أن تظهر فارغة.

export type CertLang = "ar" | "fr";
export const WORK_CERTIFICATE = "work-certificate";

export type CertEmployee = {
  name: string;
  gender: string; // M | F
  birthDate: Date | null;
  birthPlace: string | null;
  idNumber: string | null;
  socialSecurityNo: string | null;
  jobTitle: string | null;
  startDate: Date | null;
  endDate: Date | null;
};

export type CertOptions = {
  lang: CertLang;
  agencyName: string;
  agencyAddress: string;
  signerName: string;
  signerTitle: string;
  city: string;
  date: Date;
};

// ما يُحفظ في Document.data (التواريخ نصوص ISO)
export type CertData = {
  lang: CertLang;
  employee: {
    name: string;
    gender: string;
    birthDate: string | null;
    birthPlace: string;
    idNumber: string;
    socialSecurityNo: string;
    jobTitle: string;
    startDate: string | null;
    endDate: string | null;
  };
  signerName: string;
  signerTitle: string;
  city: string;
};

function fmt(d: Date): string {
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getUTCFullYear()}`;
}

const toDate = (s: string | null | undefined) => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

// المدة بالسنوات والأشهر الكاملة بين تاريخين
export function workDuration(start: Date, end: Date): { years: number; months: number } {
  let months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth());
  if (end.getUTCDate() < start.getUTCDate()) months -= 1;
  months = Math.max(0, months);
  return { years: Math.floor(months / 12), months: months % 12 };
}

// العدد مع المعدود بالعربية: سنة واحدة، سنتان، 3 سنوات، 11 سنة
function arCount(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}

function durationText(start: Date, end: Date, lang: CertLang): string {
  const { years, months } = workDuration(start, end);
  if (years === 0 && months === 0) return "";
  if (lang === "ar") {
    return [
      years ? arCount(years, "سنة واحدة", "سنتين", "سنوات", "سنة") : "",
      months ? arCount(months, "شهر واحد", "شهرين", "أشهر", "شهراً") : "",
    ]
      .filter(Boolean)
      .join(" و");
  }
  return [years ? `${years} ${years > 1 ? "ans" : "an"}` : "", months ? `${months} mois` : ""]
    .filter(Boolean)
    .join(" et ");
}

// «de» الفرنسية تُختصر قبل حرف علّة أو h: «en qualité d'Agent»
function deFr(word: string): string {
  return /^[aeiouyhàâäéèêëîïôöùûü]/i.test(word) ? `d'${word}` : `de ${word}`;
}

// هل غادر الموظف في تاريخ الشهادة؟
function hasLeft(end: Date | null, at: Date): boolean {
  return !!end && end.getTime() <= at.getTime();
}

export function certDataFrom(emp: CertEmployee, o: CertOptions): CertData {
  return {
    lang: o.lang,
    employee: {
      name: emp.name.trim(),
      gender: emp.gender === "F" ? "F" : "M",
      birthDate: emp.birthDate?.toISOString() ?? null,
      birthPlace: emp.birthPlace?.trim() ?? "",
      idNumber: emp.idNumber?.trim() ?? "",
      socialSecurityNo: emp.socialSecurityNo?.trim() ?? "",
      jobTitle: emp.jobTitle?.trim() ?? "",
      startDate: emp.startDate?.toISOString() ?? null,
      endDate: emp.endDate?.toISOString() ?? null,
    },
    signerName: o.signerName.trim(),
    signerTitle: o.signerTitle.trim(),
    city: o.city.trim(),
  };
}

export function readCertData(json: unknown): CertData | null {
  if (!json || typeof json !== "object") return null;
  const d = json as CertData;
  if (!d.employee || (d.lang !== "ar" && d.lang !== "fr")) return null;
  return d;
}

// صفة الموقّع الافتراضية حسب اللغة
export function signerTitleOf(d: CertData): string {
  return d.signerTitle || (d.lang === "ar" ? "المسيّر" : "Le Gérant");
}

// جدول بيانات الموظف في الشهادة — الصفوف المكتوبة فقط
export function certificateRows(d: CertData, docDate: Date): [string, string][] {
  const e = d.employee;
  const ar = d.lang === "ar";
  const birth = toDate(e.birthDate);
  const start = toDate(e.startDate);
  const end = toDate(e.endDate);
  const left = hasLeft(end, docDate);
  const duration = start ? durationText(start, left ? end! : docDate, d.lang) : "";
  const birthText = [birth ? fmt(birth) : "", e.birthPlace].filter(Boolean).join(ar ? " بـ " : " à ");

  const rows: [string, string][] = [
    [ar ? "الاسم واللقب" : "Nom et prénom", e.name || "—"],
    [ar ? "تاريخ ومكان الميلاد" : "Date et lieu de naissance", birthText],
    [ar ? "رقم بطاقة التعريف الوطنية" : "N° de la carte d'identité", e.idNumber],
    [ar ? "رقم الضمان الاجتماعي" : "N° de sécurité sociale", e.socialSecurityNo],
    [ar ? "الوظيفة" : "Poste occupé", e.jobTitle],
    [ar ? "تاريخ التوظيف" : "Date de recrutement", start ? fmt(start) : ""],
    left
      ? [ar ? "تاريخ نهاية العمل" : "Date de fin de fonction", fmt(end!)]
      : [ar ? "الوضعية الحالية" : "Situation actuelle", start ? (ar ? "ما زال يعمل" : "En activité") : ""],
    [ar ? "الأقدمية" : "Ancienneté", duration],
  ];
  return rows.filter(([, v]) => v.trim() !== "");
}

// النص: ثلاث فقرات يفصلها سطر فارغ (المقدمة، الإفادة، الختام)
export function certificateBody(d: CertData, o: { agencyName: string; agencyAddress: string; date: Date }): string {
  const e = d.employee;
  const f = e.gender === "F";
  const start = toDate(e.startDate);
  const end = toDate(e.endDate);
  const left = hasLeft(end, o.date);
  const duration = start ? durationText(start, left ? end! : o.date, d.lang) : "";
  const address = o.agencyAddress.trim();
  const title = signerTitleOf(d);
  const job = e.jobTitle;

  if (d.lang === "ar") {
    const agency = `وكالة ${o.agencyName} للسياحة والأسفار${address ? `، الكائن مقرها بـ ${address}` : ""}`;
    const intro = d.signerName
      ? `أنا الموقّع أدناه، ${d.signerName}، بصفتي ${title} لـ${agency}، أشهد بأن ${f ? "السيدة" : "السيد"} ${f ? "المذكورة" : "المذكور"} في الجدول أدناه:`
      : `تشهد ${agency}، بأن ${f ? "السيدة" : "السيد"} ${f ? "المذكورة" : "المذكور"} في الجدول أدناه:`;
    let work = `${left ? (f ? "عملت" : "عمل") : f ? "تعمل" : "يعمل"} لدى وكالتنا${job ? ` بصفة ${job}` : ""}`;
    if (start) work += left ? ` من ${fmt(start)} إلى ${fmt(end!)}` : ` منذ ${fmt(start)} إلى يومنا هذا`;
    if (duration) work += `، أي مدة ${duration}`;
    work += ".";
    const closing = `سُلّمت هذه الشهادة ${f ? "للمعنية بطلب منها" : "للمعني بطلب منه"} لاستعمالها في حدود ما يسمح به القانون.`;
    return [intro, work, closing].join("\n\n");
  }

  const agency = `l'agence de tourisme et de voyages ${o.agencyName}${address ? `, sise à ${address}` : ""}`;
  const who = "la personne désignée ci-dessous";
  const intro = d.signerName
    ? `Je soussigné(e), ${d.signerName}, agissant en qualité ${deFr(title)} de ${agency}, atteste par la présente que ${who} :`
    : `${agency.charAt(0).toUpperCase()}${agency.slice(1)} atteste par la présente que ${who} :`;
  const employed = f ? "employée" : "employé";
  let work = left ? `A été ${employed} au sein de notre agence` : `Est ${employed} au sein de notre agence`;
  if (job) work += ` en qualité ${deFr(job)}`;
  if (start) work += left ? ` du ${fmt(start)} au ${fmt(end!)}` : ` depuis le ${fmt(start)} à ce jour`;
  if (duration) work += `, soit une ancienneté de ${duration}`;
  work += ".";
  const closing = `La présente attestation est délivrée ${f ? "à l'intéressée" : "à l'intéressé"}, sur sa demande, pour servir et valoir ce que de droit.`;
  return [intro, work, closing].join("\n\n");
}

export function certificateTitle(lang: CertLang): { main: string } {
  return { main: lang === "ar" ? "شهادة عمل" : "ATTESTATION DE TRAVAIL" };
}

// «حُرّر بـ ... في ...» / «Fait à ..., le ...»
export function madeAt(d: CertData, date: Date): string {
  if (d.lang === "ar") return d.city ? `حُرّر بـ ${d.city} في ${fmt(date)}` : `حُرّر في ${fmt(date)}`;
  return d.city ? `Fait à ${d.city}, le ${fmt(date)}` : `Fait le ${fmt(date)}`;
}
