// صياغة شهادة العمل (Attestation de travail) بالعربية والفرنسية.
//
// تُبنى من بيانات الموظف المحفوظة، وكل معلومة غير مكتوبة تُحذف من الجملة
// بدل أن تظهر فارغة. الناتج عنوان + نص يُحفظ «مستنداً صادراً» عادياً،
// فيأخذ رقماً تسلسلياً وختماً ورمز QR للتحقق، ويمكن تعديل نصه بعد الإصدار.

export type CertLang = "ar" | "fr";

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

function fmt(d: Date): string {
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getUTCFullYear()}`;
}

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
    const parts = [
      years ? arCount(years, "سنة واحدة", "سنتين", "سنوات", "سنة") : "",
      months ? arCount(months, "شهر واحد", "شهرين", "أشهر", "شهراً") : "",
    ].filter(Boolean);
    return parts.join(" و");
  }
  const parts = [
    years ? `${years} ${years > 1 ? "ans" : "an"}` : "",
    months ? `${months} mois` : "",
  ].filter(Boolean);
  return parts.join(" et ");
}

// «de» الفرنسية تُختصر قبل حرف علّة أو h: «en qualité d'Agent»
function deFr(word: string): string {
  return /^[aeiouyhàâäéèêëîïôöùûü]/i.test(word) ? `d'${word}` : `de ${word}`;
}

export function buildWorkCertificate(emp: CertEmployee, o: CertOptions): { title: string; body: string } {
  const f = emp.gender === "F";
  const name = emp.name.trim() || "................";
  const job = emp.jobTitle?.trim() ?? "";
  const place = emp.birthPlace?.trim() ?? "";
  const idNo = emp.idNumber?.trim() ?? "";
  const ss = emp.socialSecurityNo?.trim() ?? "";
  const address = o.agencyAddress.trim();
  const signer = o.signerName.trim();
  const city = o.city.trim();
  // ما زال يعمل إن لم يُحدَّد تاريخ نهاية أو كان بعد تاريخ الشهادة
  const left = !!emp.endDate && emp.endDate.getTime() <= o.date.getTime();
  const durationEnd = left ? emp.endDate! : o.date;
  const duration = emp.startDate ? durationText(emp.startDate, durationEnd, o.lang) : "";

  if (o.lang === "ar") {
    const signerTitle = o.signerTitle.trim() || "المسيّر";
    const agency = `وكالة ${o.agencyName} للسياحة والأسفار${address ? `، الكائن مقرها بـ ${address}` : ""}`;
    const intro = signer
      ? `أنا الموقّع أدناه، ${signer}، بصفتي ${signerTitle} لـ${agency}، أشهد بأن:`
      : `تشهد ${agency}، بأن:`;

    const who = [
      `${f ? "السيدة" : "السيد"}: ${name}`,
      emp.birthDate ? `${f ? "المولودة" : "المولود"} بتاريخ ${fmt(emp.birthDate)}${place ? ` بـ ${place}` : ""}` : "",
      !emp.birthDate && place ? `${f ? "المولودة" : "المولود"} بـ ${place}` : "",
      idNo ? `${f ? "الحاملة" : "الحامل"} لبطاقة التعريف الوطنية رقم ${idNo}` : "",
      ss ? `رقم الضمان الاجتماعي ${ss}` : "",
    ]
      .filter(Boolean)
      .join("، ");

    const verb = left ? (f ? "عملت" : "عمل") : f ? "تعمل" : "يعمل";
    let work = `${verb} لدى وكالتنا${job ? ` بصفة ${job}` : ""}`;
    if (emp.startDate) {
      work += left
        ? ` من ${fmt(emp.startDate)} إلى ${fmt(emp.endDate!)}`
        : ` منذ ${fmt(emp.startDate)} إلى يومنا هذا`;
    }
    if (duration) work += `، أي مدة ${duration}`;
    work += ".";

    const body = [
      intro,
      `${who}،`,
      work,
      `سُلّمت هذه الشهادة ${f ? "للمعنية بطلب منها" : "للمعني بطلب منه"} لاستعمالها في حدود ما يسمح به القانون.`,
      "",
      city ? `حُرّر بـ ${city} في ${fmt(o.date)}` : `حُرّر في ${fmt(o.date)}`,
      signer ? `${signerTitle}: ${signer}` : signerTitle,
    ].join("\n");
    return { title: "شهادة عمل", body };
  }

  // الفرنسية
  const signerTitle = o.signerTitle.trim() || "Le Gérant";
  const agency = `l'agence de tourisme et de voyages ${o.agencyName}${address ? `, sise à ${address}` : ""}`;
  const intro = signer
    ? `Je soussigné(e), ${signer}, agissant en qualité ${deFr(signerTitle)} de ${agency}, atteste par la présente que :`
    : `${agency.charAt(0).toUpperCase()}${agency.slice(1)} atteste par la présente que :`;

  const who = [
    `${f ? "Mme" : "M."} ${name}`,
    emp.birthDate ? `${f ? "née" : "né"} le ${fmt(emp.birthDate)}${place ? ` à ${place}` : ""}` : "",
    !emp.birthDate && place ? `${f ? "née" : "né"} à ${place}` : "",
    idNo ? `titulaire de la carte nationale d'identité N° ${idNo}` : "",
    ss ? `N° de sécurité sociale ${ss}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const employed = f ? "employée" : "employé";
  let work = left ? `a été ${employed} au sein de notre agence` : `est ${employed} au sein de notre agence`;
  if (job) work += ` en qualité ${deFr(job)}`;
  if (emp.startDate) {
    work += left
      ? ` du ${fmt(emp.startDate)} au ${fmt(emp.endDate!)}`
      : ` depuis le ${fmt(emp.startDate)} à ce jour`;
  }
  if (duration) work += `, soit une durée de ${duration}`;
  work += ".";

  const body = [
    intro,
    `${who},`,
    work,
    `La présente attestation est délivrée ${f ? "à l'intéressée" : "à l'intéressé"}, sur sa demande, pour servir et valoir ce que de droit.`,
    "",
    city ? `Fait à ${city}, le ${fmt(o.date)}` : `Fait le ${fmt(o.date)}`,
    signer ? `${signerTitle} : ${signer}` : signerTitle,
  ].join("\n");
  return { title: "ATTESTATION DE TRAVAIL", body };
}
