// قراءة شريط MRZ لجواز TD3 (سطران أسفل الجواز) — مشترك بين الفيزا وبطاقة العميل
export type MrzResult = {
  nom: string;
  prenom: string;
  numero: string;
  nationalite: string;
  naissance: string; // YYYY-MM-DD
  expiration: string; // YYYY-MM-DD
};

// تحويل رمز الدولة ISO-3 إلى الاسم الفرنسي الشائع لدى الوكالة
export const NATIONALITIES: Record<string, string> = {
  ITA: "Italie", FRA: "France", DEU: "Allemagne", ESP: "Espagne", GBR: "Royaume-Uni",
  USA: "États-Unis", CAN: "Canada", CHE: "Suisse", BEL: "Belgique", NLD: "Pays-Bas",
  AUT: "Autriche", PRT: "Portugal", POL: "Pologne", JPN: "Japon", CHN: "Chine",
  RUS: "Russie", TUR: "Turquie", DZA: "Algérie", TUN: "Tunisie", MAR: "Maroc",
  EGY: "Égypte", SAU: "Arabie saoudite", ARE: "Émirats arabes unis", QAT: "Qatar",
  KWT: "Koweït", JOR: "Jordanie", LBN: "Liban", SWE: "Suède", NOR: "Norvège",
  DNK: "Danemark", FIN: "Finlande", IRL: "Irlande", GRC: "Grèce", CZE: "Tchéquie",
  AUS: "Australie", NZL: "Nouvelle-Zélande", BRA: "Brésil", ARG: "Argentine", MEX: "Mexique",
  KOR: "Corée du Sud", IND: "Inde", IDN: "Indonésie", MYS: "Malaisie", SGP: "Singapour",
};

// الـ MRZ لا يحمل القرن. تاريخ الميلاد لا يكون في المستقبل (فمسافر عمره 90 سنة
// مولود 1935 لا يُقرأ 2035)، أما انتهاء الجواز فدائماً في هذا القرن.
export function mrzDate(s: string, kind: "birth" | "expiry" = "expiry"): string {
  if (!/^\d{6}$/.test(s)) return "";
  const yy = parseInt(s.slice(0, 2), 10);
  let year = 2000 + yy;
  if (kind === "birth" && year > new Date().getUTCFullYear()) {
    year -= 100;
  }
  return `${year}-${s.slice(2, 4)}-${s.slice(4, 6)}`;
}

export function parseMRZ(text: string): Partial<MrzResult> | null {
  const lines = text
    .toUpperCase()
    .replace(/[«]/g, "<")
    .split(/\s*\n\s*/)
    .map((l) => l.replace(/[^A-Z0-9<]/g, ""))
    .filter((l) => l.length >= 40 && l.includes("<"));

  // السطر الأول لجواز TD3 يحتوي دائماً على «<<» بين اللقب والاسم (نتسامح مع أخطاء OCR في «P<»)
  const l1 = lines.find((l) => l.includes("<<")) ?? lines.find((l) => l.startsWith("P"));
  const idx = l1 ? lines.indexOf(l1) : -1;
  const l2 =
    idx >= 0 ? lines.find((l, i) => i > idx && /\d/.test(l) && l.length >= 40) ?? lines[idx + 1] : undefined;
  if (!l1 || !l2) return null;

  // بعد «P<» ورمز الدولة (5 خانات) يبدأ الاسم
  const names = l1.replace(/^P.?[A-Z<]{3}/, "").replace(/^</, "").split("<<");
  const nom = (names[0] ?? "").replace(/</g, " ").trim();
  const prenom = (names[1] ?? "").replace(/</g, " ").trim();

  const numero = l2.slice(0, 9).replace(/</g, "").trim();
  const natCode = l2.slice(10, 13).replace(/</g, "");
  const naissance = mrzDate(l2.slice(13, 19), "birth");
  const expiration = mrzDate(l2.slice(21, 27), "expiry");

  if (!nom && !numero) return null;
  return {
    nom,
    prenom,
    numero,
    nationalite: NATIONALITIES[natCode] ?? natCode,
    naissance,
    expiration,
  };
}
