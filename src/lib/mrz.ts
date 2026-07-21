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

export function mrzDate(s: string): string {
  if (!/^\d{6}$/.test(s)) return "";
  const yy = parseInt(s.slice(0, 2), 10);
  const nowYY = new Date().getUTCFullYear() % 100;
  const century = yy > nowYY + 10 ? 1900 : 2000;
  return `${century + yy}-${s.slice(2, 4)}-${s.slice(4, 6)}`;
}

export function parseMRZ(text: string): Partial<MrzResult> | null {
  const lines = text
    .toUpperCase()
    .replace(/[«]/g, "<")
    .split(/\s*\n\s*/)
    .map((l) => l.replace(/[^A-Z0-9<]/g, ""))
    .filter((l) => l.length >= 40 && l.includes("<"));

  const l1 = lines.find((l) => l.startsWith("P<"));
  const idx = l1 ? lines.indexOf(l1) : -1;
  const l2 = idx >= 0 ? lines[idx + 1] : lines.find((l, i) => i > 0 && /^[A-Z0-9<]{40,}$/.test(l));
  if (!l1 || !l2) return null;

  const names = l1.slice(5).split("<<");
  const nom = (names[0] ?? "").replace(/</g, " ").trim();
  const prenom = (names[1] ?? "").replace(/</g, " ").trim();

  const numero = l2.slice(0, 9).replace(/</g, "").trim();
  const natCode = l2.slice(10, 13).replace(/</g, "");
  const naissance = mrzDate(l2.slice(13, 19));
  const expiration = mrzDate(l2.slice(21, 27));

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
