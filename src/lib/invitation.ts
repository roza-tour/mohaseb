// نصوص خطاب الدعوة بثلاث لغات (عربي/فرنسي/إنجليزي) لعدة أشخاص.
// تُعاد مُقسَّمة إلى أجزاء (مرسَل إليه، موضوع، فقرات، جدول أشخاص، توقيع)
// حتى يستطيع مُولّد الـ PDF تنسيق كل جزء بشكله الرسمي الصحيح.
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

export type InvBody = {
  title: string;
  recipient: string;
  subjectLabel: string;
  subject: string;
  salutation: string;
  intro: string;
  paras: string[];
  closing: string;
  doneOn: string;
  agency: string;
  peopleTitle: string;
  cols: { n: string; name: string; passport: string };
  itineraryTitle: string;
};

export function invitationBody(lang: InvLang, d: InvData): InvBody {
  const many = d.people.length > 1;

  if (lang === "ar") {
    return {
      title: "دعوة سياحية",
      recipient: `إلى السيد قنصل ${d.consulate}`,
      subjectLabel: "الموضوع",
      subject: "طلب الموافقة على تأشيرة — دعوة سياحية",
      salutation: "سيدي القنصل المحترم،",
      intro: `يشرّف وكالة ${d.agency} أن تطلب الموافقة على منح التأشيرة السياحية ${
        many ? "للأشخاص المذكورين أدناه" : "للشخص المذكور أدناه"
      }، للقيام برحلة سياحية إلى الجزائر ضمن برنامج «${d.program}».`,
      paras: [
        `من المقرّر أن تكون الإقامة من ${d.arrival} إلى ${d.departure}.`,
        "تتكفّل وكالتنا بكامل البرنامج السياحي (الإقامة والنقل والمرافقة) طوال مدة الرحلة.",
        `وعليه، نرجو من سيادتكم التكرّم بمنح ${many ? "المعنيّين" : "المعني"} التأشيرة اللازمة لتحقيق هذه الرحلة.`,
      ],
      closing: "وتفضّلوا بقبول فائق الاحترام والتقدير.",
      doneOn: `حُرِّر في ${d.today}`,
      agency: d.agency,
      peopleTitle: many ? "قائمة المعنيّين بالدعوة" : "بيانات المعني بالدعوة",
      cols: { n: "م", name: "الاسم الكامل", passport: "رقم جواز السفر" },
      itineraryTitle: "مخطط الرحلة",
    };
  }

  if (lang === "en") {
    return {
      title: "Letter of Invitation",
      recipient: `To the Consulate of ${d.consulate}`,
      subjectLabel: "Subject",
      subject: "Request for visa approval – Tourist letter of invitation",
      salutation: "Dear Sir or Madam,",
      intro: `We, ${d.agency}, have the honour to request the approval of a tourist visa for the ${
        many ? "persons" : "person"
      } listed below, to undertake a tourist trip to Algeria under the programme "${d.program}".`,
      paras: [
        `The stay is scheduled from ${d.arrival} to ${d.departure}.`,
        "Our agency guarantees the full tourist programme (accommodation, transport and guidance) throughout the entire stay.",
        `Accordingly, we kindly request that you grant the ${
          many ? "persons" : "person"
        } concerned the visa necessary to carry out this trip.`,
      ],
      closing: "Please accept the assurance of our highest consideration.",
      doneOn: `Done on ${d.today}`,
      agency: d.agency,
      peopleTitle: many ? "List of persons concerned" : "Person concerned",
      cols: { n: "No.", name: "Full name", passport: "Passport No." },
      itineraryTitle: "Trip Itinerary",
    };
  }

  return {
    title: "Lettre d'invitation",
    recipient: `À l'attention du Consulat de ${d.consulate}`,
    subjectLabel: "Objet",
    subject: "Demande d'approbation de visa – Lettre d'invitation touristique",
    salutation: "Madame, Monsieur,",
    intro: `Par la présente, l'agence ${d.agency} a l'honneur de solliciter l'approbation du visa touristique au profit ${
      many ? "des personnes désignées ci-dessous" : "de la personne désignée ci-dessous"
    }, pour effectuer un voyage touristique en Algérie dans le cadre du programme « ${d.program} ».`,
    paras: [
      `Le séjour est prévu du ${d.arrival} au ${d.departure}.`,
      "Notre agence se porte garante de la prise en charge du programme touristique (hébergement, transport et accompagnement) pendant toute la durée du séjour.",
      `En conséquence, nous vous prions de bien vouloir accorder ${
        many ? "aux intéressés" : "à l'intéressé(e)"
      } le visa nécessaire pour la réalisation de ce voyage.`,
    ],
    closing: "Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.",
    doneOn: `Fait le ${d.today}`,
    agency: d.agency,
    peopleTitle: many ? "Liste des personnes concernées" : "Personne concernée",
    cols: { n: "N°", name: "Nom et prénom", passport: "N° de passeport" },
    itineraryTitle: "Programme du voyage",
  };
}
