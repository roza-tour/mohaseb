// بيان الراتب (Relevé de salaire) بالعربية والفرنسية — بنفس تصميم شهادة العمل.
//
// نظام الأجر يُحفظ في ملف الموظف: راتب ثابت، أو نسبة (عمولة)، أو الاثنان.
// عند الإصدار يُختار الشهر ومبلغ الأعمال المحسوبة عليه النسبة، ومنح واقتطاعات اختيارية.
// يُحفظ «مستنداً صادراً» من نوع salary-statement: البيانات في Document.data،
// والنص فقرتان في Document.body (المقدمة، الختام) قابلتان للتعديل.
import { deFr, type CertLang } from "./workCertificate";
import type { PayRow } from "./pdf/WorkCertificatePdf";

export const SALARY_STATEMENT = "salary-statement";

export const PAY_TYPES: Record<string, string> = {
  salary: "راتب ثابت",
  commission: "نسبة (عمولة)",
  both: "راتب ثابت + نسبة",
};

export type SalaryData = {
  lang: CertLang;
  period: string; // YYYY-MM
  employee: {
    name: string;
    gender: string;
    jobTitle: string;
    idNumber: string;
    socialSecurityNo: string;
    startDate: string | null;
  };
  payType: string;
  baseSalary: number;
  commissionRate: number;
  commissionBase: number;
  bonus: number;
  deductions: number;
  currency: string;
  signerName: string;
  signerTitle: string;
  signerRole: string;
  signerGender: "M" | "F" | "";
};

const AR_MONTHS = [
  "جانفي",
  "فيفري",
  "مارس",
  "أفريل",
  "ماي",
  "جوان",
  "جويلية",
  "أوت",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];
const FR_MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

export function periodText(period: string, lang: CertLang): string {
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (!m) return period;
  const i = Number(m[2]) - 1;
  return lang === "ar" ? `${AR_MONTHS[i]} ${m[1]}` : `${FR_MONTHS[i]} ${m[1]}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

// مبلغ بخانتين عشريتين: «500 000,00 DA» بالفرنسية، «500,000.00 دج» بالعربية
export function money(n: number, currency: string, lang: CertLang): string {
  const fixed = Math.abs(n).toFixed(2);
  const [int, dec] = fixed.split(".");
  const sep = lang === "fr" ? " " : ",";
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  const num = lang === "fr" ? `${grouped},${dec}` : `${grouped}.${dec}`;
  const cur = currency === "DZD" ? (lang === "ar" ? "دج" : "DA") : currency;
  return `${n < 0 ? "- " : ""}${num} ${cur}`;
}

const hasSalary = (d: SalaryData) => d.payType === "salary" || d.payType === "both";
const hasCommission = (d: SalaryData) => d.payType === "commission" || d.payType === "both";

export function salaryAmounts(d: SalaryData) {
  const base = hasSalary(d) ? d.baseSalary || 0 : 0;
  const commission = hasCommission(d) ? ((d.commissionBase || 0) * (d.commissionRate || 0)) / 100 : 0;
  const net = base + commission + (d.bonus || 0) - (d.deductions || 0);
  return { base, commission, net };
}

export function salaryTitle(lang: CertLang): string {
  return lang === "ar" ? "بيان راتب" : "RELEVÉ DE SALAIRE";
}

// جدول بيانات الموظف والفترة — الصفوف المكتوبة فقط
export function salaryRows(d: SalaryData): [string, string][] {
  const ar = d.lang === "ar";
  const e = d.employee;
  const rows: [string, string][] = [
    [ar ? "الاسم واللقب" : "Nom et prénom", e.name || "—"],
    [ar ? "الوظيفة" : "Poste occupé", e.jobTitle],
    [ar ? "رقم بطاقة التعريف الوطنية" : "N° de la carte d'identité", e.idNumber],
    [ar ? "رقم الضمان الاجتماعي" : "N° de sécurité sociale", e.socialSecurityNo],
    [ar ? "تاريخ التوظيف" : "Date de recrutement", fmtDate(e.startDate)],
    [ar ? "نظام الأجر" : "Mode de rémunération", payTypeText(d.payType, d.lang)],
    [ar ? "الفترة" : "Période", ar ? `شهر ${periodText(d.period, "ar")}` : `Mois de ${periodText(d.period, "fr")}`],
  ];
  return rows.filter(([, v]) => v.trim() !== "");
}

function payTypeText(t: string, lang: CertLang): string {
  if (lang === "ar")
    return t === "commission" ? "نسبة من الأعمال" : t === "both" ? "راتب ثابت + نسبة" : "راتب شهري ثابت";
  return t === "commission" ? "Commission" : t === "both" ? "Salaire fixe + commission" : "Salaire mensuel fixe";
}

function rate(n: number, lang: CertLang): string {
  const s = Number.isInteger(n) ? String(n) : String(n).replace(".", lang === "fr" ? "," : ".");
  return lang === "fr" ? `${s} %` : `${s}%`;
}

// جدول المبالغ: الراتب الأساسي، العمولة، المنح، الاقتطاعات، الصافي
export function salaryPayRows(d: SalaryData): PayRow[] {
  const ar = d.lang === "ar";
  const { base, commission, net } = salaryAmounts(d);
  const m = (n: number) => money(n, d.currency, d.lang);
  const rows: PayRow[] = [];
  if (hasSalary(d)) rows.push({ label: ar ? "الراتب الأساسي" : "Salaire de base", amount: m(base) });
  if (hasCommission(d)) {
    rows.push({
      label: ar
        ? `العمولة (${rate(d.commissionRate, "ar")} من ${m(d.commissionBase)})`
        : `Commission (${rate(d.commissionRate, "fr")} de ${m(d.commissionBase)})`,
      amount: m(commission),
    });
  }
  if (d.bonus > 0) rows.push({ label: ar ? "منح وعلاوات" : "Primes et indemnités", amount: m(d.bonus) });
  if (d.deductions > 0) rows.push({ label: ar ? "اقتطاعات" : "Retenues", amount: m(-d.deductions) });
  rows.push({ label: ar ? "الصافي المستحق" : "Net à payer", amount: m(net), total: true });
  return rows;
}

// النص: فقرتان يفصلهما سطر فارغ (المقدمة قبل الجدولين، الختام بعدهما)
export function salaryBody(d: SalaryData, o: { agencyName: string; agencyAddress: string }): string {
  const f = d.employee.gender === "F";
  const address = o.agencyAddress.trim();
  const role = d.signerRole || d.signerTitle || (d.lang === "ar" ? "المسيّر" : "gérant");
  const month = periodText(d.period, d.lang);

  if (d.lang === "ar") {
    const agency = `وكالة ${o.agencyName} للسياحة والأسفار${address ? `، الكائن مقرها بـ ${address}` : ""}`;
    const who = `${f ? "السيدة المذكورة" : "السيد المذكور"} في الجدول أدناه، ${f ? "التي تعمل" : "الذي يعمل"} لدى وكالتنا، ${f ? "قد تقاضت" : "قد تقاضى"} عن شهر ${month} الأجر المفصّل كما يلي:`;
    const intro = d.signerName
      ? `أنا ${d.signerGender === "F" ? "الموقّعة" : "الموقّع"} أدناه، ${d.signerName}، بصفتي ${role} لـ${agency}، أشهد بأن ${who}`
      : `تشهد ${agency}، بأن ${who}`;
    const closing = `سُلّم هذا البيان ${f ? "للمعنية بطلب منها" : "للمعني بطلب منه"} لاستعماله في حدود ما يسمح به القانون.`;
    return [intro, closing].join("\n\n");
  }

  const agency = `l'agence de tourisme et de voyages ${o.agencyName}${address ? `, sise à ${address}` : ""}`;
  const who = `la personne désignée ci-dessous, ${f ? "employée" : "employé"} au sein de notre agence, a perçu au titre du mois de ${month} la rémunération détaillée ci-après :`;
  const soussigne = d.signerGender === "F" ? "soussignée" : d.signerGender === "M" ? "soussigné" : "soussigné(e)";
  const intro = d.signerName
    ? `Je ${soussigne}, ${d.signerName}, agissant en qualité ${deFr(role)} de ${agency}, atteste par la présente que ${who}`
    : `${agency.charAt(0).toUpperCase()}${agency.slice(1)} atteste par la présente que ${who}`;
  const closing = `Le présent relevé est délivré ${f ? "à l'intéressée" : "à l'intéressé"}, sur sa demande, pour servir et valoir ce que de droit.`;
  return [intro, closing].join("\n\n");
}

export function readSalaryData(json: unknown): SalaryData | null {
  if (!json || typeof json !== "object") return null;
  const d = json as SalaryData;
  if (!d.employee || (d.lang !== "ar" && d.lang !== "fr") || typeof d.period !== "string") return null;
  return d;
}
