// بيان الراتب (Relevé de salaire) بالعربية والفرنسية — بنفس تصميم شهادة العمل.
//
// نظام الأجر يُحفظ في ملف الموظف: راتب ثابت، أو نسبة (عمولة)، أو الاثنان.
// عند الإصدار يُختار الشهر وقيمة الأعمال التي جلبها الموظف نفسه (تُحسب عليها النسبة)،
// ومنح واقتطاعات اختيارية.
// يُحفظ «مستنداً صادراً» من نوع salary-statement: البيانات في Document.data،
// والنص فقرتان في Document.body (المقدمة، الختام) قابلتان للتعديل.
import { deFr, type CertLang } from "./workCertificate";
import type { PayRow } from "./pdf/WorkCertificatePdf";

export const SALARY_STATEMENT = "salary-statement";

export type SalaryMonth = { period: string; commissionBase: number; bonus: number; deductions: number };

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
  // بيان لعدة أشهر: سطر لكل شهر (الأعمال المجلوبة، المنح، الاقتطاعات) — غيابه = شهر واحد
  months?: SalaryMonth[];
  // عملة قيمة الأعمال والعمولة (يورو أو دينار...) — الفارغ = عملة الراتب
  commissionCurrency?: string;
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
  const cur = currency === "DZD" ? (lang === "ar" ? "دج" : "DA") : currency === "EUR" ? "€" : currency;
  return `${n < 0 ? "- " : ""}${num} ${cur}`;
}

const hasSalary = (d: SalaryData) => d.payType === "salary" || d.payType === "both";
const hasCommission = (d: SalaryData) => d.payType === "commission" || d.payType === "both";

export const commissionCurrencyOf = (d: SalaryData) => d.commissionCurrency || d.currency;

// المبالغ: العمولة بعملة الأعمال، والباقي بعملة الراتب. الصافي لكل عملة على حدة
// (لا يُجمع اليورو مع الدينار): «45 000,00 DA + 500,00 €»
export function salaryAmounts(d: SalaryData) {
  const base = hasSalary(d) ? d.baseSalary || 0 : 0;
  const commission = hasCommission(d) ? ((d.commissionBase || 0) * (d.commissionRate || 0)) / 100 : 0;
  const cc = commissionCurrencyOf(d);
  const totals = new Map<string, number>();
  const add = (cur: string, n: number) => totals.set(cur, (totals.get(cur) ?? 0) + n);
  if (hasSalary(d) || d.bonus > 0 || d.deductions > 0) add(d.currency, base + (d.bonus || 0) - (d.deductions || 0));
  if (hasCommission(d)) add(cc, commission);
  if (totals.size === 0) add(d.currency, 0);
  return { base, commission, totals: [...totals.entries()] };
}

export function salaryTitle(lang: CertLang): string {
  return lang === "ar" ? "بيان راتب" : "RELEVÉ DE SALAIRE";
}

// جدول بيانات الموظف والفترة — الصفوف المكتوبة فقط
export function salaryRows(d: SalaryData): [string, string][] {
  const ar = d.lang === "ar";
  const e = d.employee;
  const f = e.gender === "F";
  const rows: [string, string][] = [
    [ar ? "الاسم واللقب" : "Nom et prénom", e.name || "—"],
    [ar ? "الوظيفة" : "Poste occupé", e.jobTitle],
    [ar ? "رقم بطاقة التعريف الوطنية" : "N° de la carte d'identité", e.idNumber],
    [ar ? "رقم الضمان الاجتماعي" : "N° de sécurité sociale", e.socialSecurityNo],
    [ar ? "تاريخ التوظيف" : "Date de recrutement", fmtDate(e.startDate)],
    [ar ? "نظام الأجر" : "Mode de rémunération", payTypeText(d)],
    [ar ? "الفترة" : "Période", periodRangeText(d)],
  ];
  // أساس العمولة: قيمة الأعمال التي جلبها الموظف نفسه خلال الشهر
  // بيان عدة أشهر: مجموع الأعمال يظهر في سطر «المجموع» بجدول الأشهر، فلا يُكرَّر هنا
  if (hasCommission(d) && monthsOf(d).length === 1) {
    rows.push([
      ar
        ? `قيمة الأعمال التي ${f ? "جلبتها" : "جلبها"} خلال ${monthsOf(d).length > 1 ? "الفترة" : "الشهر"}`
        : `Affaires apportées par ${f ? "l'intéressée" : "l'intéressé"}`,
      money(
        monthsOf(d).reduce((sum, mo) => sum + (mo.commissionBase || 0), 0),
        commissionCurrencyOf(d),
        d.lang,
      ),
    ]);
  }
  return rows.filter(([, v]) => v.trim() !== "");
}

// نظام الأجر: العمولة دائماً على الأعمال التي يجلبها الموظف نفسه
function payTypeText(d: SalaryData): string {
  const t = d.payType;
  const f = d.employee.gender === "F";
  if (d.lang === "ar") {
    const c = `نسبة من الأعمال التي ${f ? "تجلبها" : "يجلبها"}`;
    return t === "commission" ? c : t === "both" ? `راتب ثابت + ${c}` : "راتب شهري ثابت";
  }
  const c = `commission sur les affaires ${f ? "qu'elle apporte" : "qu'il apporte"}`;
  if (t === "commission") return c.charAt(0).toUpperCase() + c.slice(1);
  return t === "both" ? `Salaire fixe + ${c}` : "Salaire mensuel fixe";
}

function rate(n: number, lang: CertLang): string {
  const s = Number.isInteger(n) ? String(n) : String(n).replace(".", lang === "fr" ? "," : ".");
  return lang === "fr" ? `${s} %` : `${s}%`;
}

// جدول المبالغ: الراتب الأساسي، العمولة، المنح، الاقتطاعات، الصافي
export function salaryPayRows(d: SalaryData): PayRow[] {
  const ar = d.lang === "ar";
  const { base, commission, totals } = salaryAmounts(d);
  const m = (n: number) => money(n, d.currency, d.lang);
  const mc = (n: number) => money(n, commissionCurrencyOf(d), d.lang);
  const rows: PayRow[] = [];
  if (hasSalary(d)) rows.push({ label: ar ? "الراتب الأساسي" : "Salaire de base", amount: m(base) });
  if (hasCommission(d)) {
    rows.push({
      label: ar
        ? // قيمة الأعمال نفسها في جدول البيانات أعلاه — هنا النسبة وأصلها باختصار
          `عمولة ${rate(d.commissionRate, "ar")} من الأعمال التي ${d.employee.gender === "F" ? "جلبتها" : "جلبها"}`
        : `Commission de ${rate(d.commissionRate, "fr")} sur les affaires apportées`,
      amount: mc(commission),
    });
  }
  if (d.bonus > 0) rows.push({ label: ar ? "منح وعلاوات" : "Primes et indemnités", amount: m(d.bonus) });
  if (d.deductions > 0) rows.push({ label: ar ? "اقتطاعات" : "Retenues", amount: m(-d.deductions) });
  rows.push({
    label: ar ? "الصافي المستحق" : "Net à payer",
    amount: totals.map(([cur, n]) => money(n, cur, d.lang)).join(" + "),
    total: true,
  });
  return rows;
}

// النص: فقرتان يفصلهما سطر فارغ (المقدمة قبل الجدولين، الختام بعدهما)
export function salaryBody(d: SalaryData, o: { agencyName: string; agencyAddress: string }): string {
  const f = d.employee.gender === "F";
  const address = o.agencyAddress.trim();
  const role = d.signerRole || d.signerTitle || (d.lang === "ar" ? "المسيّر" : "gérant");
  const ms = monthsOf(d);
  const multi = ms.length > 1;
  const first = periodText(ms[0].period, d.lang);
  const last = periodText(ms[ms.length - 1].period, d.lang);

  if (d.lang === "ar") {
    const agency = `وكالة ${o.agencyName} للسياحة والأسفار${address ? `، الكائن مقرها بـ ${address}` : ""}`;
    const who = `${f ? "السيدة المذكورة" : "السيد المذكور"} في الجدول أدناه، ${f ? "التي تعمل" : "الذي يعمل"} لدى وكالتنا، ${f ? "قد تقاضت" : "قد تقاضى"} ${multi ? `عن الفترة من شهر ${first} إلى شهر ${last}` : `عن شهر ${first}`} الأجر المفصّل كما يلي:`;
    const intro = d.signerName
      ? `أنا ${d.signerGender === "F" ? "الموقّعة" : "الموقّع"} أدناه، ${d.signerName}، بصفتي ${role} لـ${agency}، أشهد بأن ${who}`
      : `تشهد ${agency}، بأن ${who}`;
    const closing = `سُلّم هذا البيان ${f ? "للمعنية بطلب منها" : "للمعني بطلب منه"} لاستعماله في حدود ما يسمح به القانون.`;
    return [intro, closing].join("\n\n");
  }

  const agency = `l'agence de tourisme et de voyages ${o.agencyName}${address ? `, sise à ${address}` : ""}`;
  const who = `la personne désignée ci-dessous, ${f ? "employée" : "employé"} au sein de notre agence, a perçu ${multi ? `au titre de la période du mois de ${first} au mois de ${last}` : `au titre du mois de ${first}`} la rémunération détaillée ci-après :`;
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

// أشهر البيان (البيانات القديمة: شهر واحد من الحقول العليا)
export function monthsOf(d: SalaryData): SalaryMonth[] {
  if (d.months && d.months.length > 0) return d.months;
  return [{ period: d.period, commissionBase: d.commissionBase, bonus: d.bonus, deductions: d.deductions }];
}

function arMonthsCount(n: number): string {
  if (n === 1) return "شهر واحد";
  if (n === 2) return "شهران";
  if (n >= 3 && n <= 10) return `${n} أشهر`;
  return `${n} شهراً`;
}

// «شهر أكتوبر 2026» أو «من شهر جانفي 2026 إلى شهر جوان 2026 (6 أشهر)»
export function periodRangeText(d: SalaryData): string {
  const ms = monthsOf(d);
  const ar = d.lang === "ar";
  const first = periodText(ms[0].period, d.lang);
  if (ms.length === 1) return ar ? `شهر ${first}` : `Mois de ${first}`;
  const last = periodText(ms[ms.length - 1].period, d.lang);
  return ar
    ? `من شهر ${first} إلى شهر ${last} (${arMonthsCount(ms.length)})`
    : `Du mois de ${first} au mois de ${last} (${ms.length} mois)`;
}

export type MonthTable = { headers: string[]; rows: string[][]; total: string[] };

// بيان عدة أشهر: جدول بسطر لكل شهر وسطر إجمالي — الأعمدة الفارغة لا تظهر
export function salaryMonthTable(d: SalaryData): MonthTable {
  const ar = d.lang === "ar";
  const ms = monthsOf(d);
  const cc = commissionCurrencyOf(d);
  const sal = hasSalary(d);
  const com = hasCommission(d);
  const anyBonus = ms.some((mo) => mo.bonus > 0);
  const anyDed = ms.some((mo) => mo.deductions > 0);
  const base = sal ? d.baseSalary || 0 : 0;
  const m = (n: number) => money(n, d.currency, d.lang);
  const mc = (n: number) => money(n, cc, d.lang);

  const headers = [ar ? "الشهر" : "Mois"];
  if (sal) headers.push(ar ? "الراتب الأساسي" : "Salaire de base");
  if (com) {
    headers.push(ar ? "الأعمال المجلوبة" : "Affaires apportées");
    headers.push(ar ? `العمولة (${rate(d.commissionRate, "ar")})` : `Commission (${rate(d.commissionRate, "fr")})`);
  }
  if (anyBonus) headers.push(ar ? "منح وعلاوات" : "Primes");
  if (anyDed) headers.push(ar ? "اقتطاعات" : "Retenues");
  headers.push(ar ? "الصافي" : "Net");

  // الصافي لكل عملة على حدة: ما بعملة الراتب، والعمولة إن كانت بعملة أخرى
  const netText = (local: number, commission: number) => {
    const same = cc === d.currency;
    const parts: string[] = [];
    if (sal || anyBonus || anyDed || same) parts.push(m(local + (same ? commission : 0)));
    if (com && !same) parts.push(mc(commission));
    return parts.join(" + ");
  };

  const sum = { base: 0, business: 0, commission: 0, bonus: 0, ded: 0 };
  const rows = ms.map((mo) => {
    const commission = com ? ((mo.commissionBase || 0) * (d.commissionRate || 0)) / 100 : 0;
    sum.base += base;
    sum.business += mo.commissionBase || 0;
    sum.commission += commission;
    sum.bonus += mo.bonus || 0;
    sum.ded += mo.deductions || 0;
    const row = [periodText(mo.period, d.lang)];
    if (sal) row.push(m(base));
    if (com) row.push(mc(mo.commissionBase || 0), mc(commission));
    if (anyBonus) row.push(mo.bonus ? m(mo.bonus) : "—");
    if (anyDed) row.push(mo.deductions ? m(-mo.deductions) : "—");
    row.push(netText(base + (mo.bonus || 0) - (mo.deductions || 0), commission));
    return row;
  });

  const total = [ar ? "المجموع" : "Total"];
  if (sal) total.push(m(sum.base));
  if (com) total.push(mc(sum.business), mc(sum.commission));
  if (anyBonus) total.push(m(sum.bonus));
  if (anyDed) total.push(m(-sum.ded));
  total.push(netText(sum.base + sum.bonus - sum.ded, sum.commission));
  return { headers, rows, total };
}
