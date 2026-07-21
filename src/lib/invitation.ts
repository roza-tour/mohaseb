// نصوص خطاب الدعوة بثلاث لغات (عربي/فرنسي/إنجليزي) لعدة أشخاص.
export type InvLang = "ar" | "fr" | "en";
export type Person = { name: string; passport: string };

export type InvData = {
  consulate: string;
  agency: string;
  people: Person[];
  program: string;
  arrival: string; // مُنسّق dd/mm/yyyy
  departure: string;
  today: string;
};

function personLine(p: Person, lang: InvLang): string {
  const pass = p.passport?.trim();
  if (lang === "ar") return `- ${p.name}${pass ? ` (جواز سفر رقم ${pass})` : ""}`;
  if (lang === "en") return `- ${p.name}${pass ? ` (passport No. ${pass})` : ""}`;
  return `- ${p.name}${pass ? ` (passeport n° ${pass})` : ""}`;
}

// يعيد عنوان المستند + نص الصفحة الأولى + عنوان صفحة المخطط
export function invitationBody(lang: InvLang, d: InvData): {
  title: string;
  page1: string;
  itineraryTitle: string;
} {
  const many = d.people.length > 1;
  const peopleBlock = d.people.map((p) => personLine(p, lang)).join("\n");
  const single = d.people[0];

  if (lang === "ar") {
    const who = many
      ? `الأشخاص التالية أسماؤهم:\n${peopleBlock}`
      : `السيد/ة ${single?.name ?? ""}${single?.passport ? `، حامل جواز السفر رقم ${single.passport}` : ""}`;
    return {
      title: "دعوة",
      itineraryTitle: "مخطط الرحلة",
      page1: [
        `إلى السيد قنصل ${d.consulate}`,
        "",
        "الموضوع: طلب الموافقة على تأشيرة — دعوة سياحية",
        "",
        "سيدي القنصل المحترم،",
        "",
        `يشرّف وكالة ${d.agency} أن تطلب الموافقة على منح التأشيرة السياحية إلى ${who} للقيام برحلة سياحية إلى الجزائر ضمن برنامج «${d.program}».`,
        "",
        `من المقرّر أن تكون الإقامة من ${d.arrival} إلى ${d.departure}.`,
        "",
        "تتكفّل وكالتنا بكامل البرنامج السياحي (الإقامة والنقل والمرافقة) طوال مدة الرحلة.",
        "",
        "وعليه، نرجو من سيادتكم التكرّم بمنح المعنيّين التأشيرة اللازمة لتحقيق هذه الرحلة.",
        "",
        "وتفضّلوا بقبول فائق الاحترام والتقدير.",
        "",
        `حُرِّر في ${d.today}`,
        d.agency,
      ].join("\n"),
    };
  }

  if (lang === "en") {
    const who = many
      ? `the following persons:\n${peopleBlock}`
      : `Mr./Ms. ${single?.name ?? ""}${single?.passport ? `, holder of passport No. ${single.passport}` : ""}`;
    return {
      title: "Letter of Invitation",
      itineraryTitle: "Trip Itinerary",
      page1: [
        `To the Consulate of ${d.consulate}`,
        "",
        "Subject: Request for visa approval – Tourist letter of invitation",
        "",
        "Dear Sir or Madam,",
        "",
        `We, ${d.agency}, have the honour to request the approval of a tourist visa for ${who} to undertake a tourist trip to Algeria under the programme "${d.program}".`,
        "",
        `The stay is scheduled from ${d.arrival} to ${d.departure}.`,
        "",
        "Our agency guarantees the full tourist programme (accommodation, transport and guidance) throughout the entire stay.",
        "",
        "Accordingly, we kindly request that you grant the persons concerned the visa necessary to carry out this trip.",
        "",
        "Please accept the assurance of our highest consideration.",
        "",
        `Done on ${d.today}`,
        d.agency,
      ].join("\n"),
    };
  }

  const who = many
    ? `les personnes suivantes :\n${peopleBlock}`
    : `M./Mme ${single?.name ?? ""}${single?.passport ? `, titulaire du passeport n° ${single.passport}` : ""}`;
  return {
    title: "Lettre d'invitation",
    itineraryTitle: "Programme du voyage",
    page1: [
      `À l'attention du Consulat de ${d.consulate}`,
      "",
      "Objet : Demande d'approbation de visa – Lettre d'invitation touristique",
      "",
      "Madame, Monsieur,",
      "",
      `Par la présente, l'agence ${d.agency} a l'honneur de solliciter l'approbation du visa touristique au profit de ${who} pour effectuer un voyage touristique en Algérie dans le cadre du programme « ${d.program} ».`,
      "",
      `Le séjour est prévu du ${d.arrival} au ${d.departure}.`,
      "",
      "Notre agence se porte garante de la prise en charge du programme touristique (hébergement, transport et accompagnement) pendant toute la durée du séjour.",
      "",
      "En conséquence, nous vous prions de bien vouloir accorder aux intéressés le visa nécessaire pour la réalisation de ce voyage.",
      "",
      "Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.",
      "",
      `Fait le ${d.today}`,
      d.agency,
    ].join("\n"),
  };
}
