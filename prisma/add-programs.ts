// إضافة برامج سياحية جاهزة إلى قاعدة البيانات دون المساس بالبيانات الموجودة.
// يُشغَّل مرة واحدة على السيرفر:  npx tsx prisma/add-programs.ts
// آمن للتكرار: يتخطى أي برنامج موجود بنفس الاسم.
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

// تحميل متغيّرات .env يدوياً (السكربت لا يحمّلها تلقائياً كما يفعل التطبيق)
function loadEnv() {
  if (process.env.DATABASE_URL) return;
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    if (process.env[key]) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
loadEnv();

const prisma = new PrismaClient();

type Seed = {
  name: string;
  durationDays: number;
  description: string;
  itinerary: string;
  standardPrice?: number;
  currency?: string;
};

const PROGRAMS: Seed[] = [
  {
    name: "Explore the Highlights of Algeria – 8-Day Tour",
    durationDays: 8,
    currency: "EUR",
    description:
      "Explore the highlights of Algeria on an 8-day tour from Algiers. Visit the Bardo Museum, the Kasbah of Algiers, the Martyrs' Memorial, the Royal Mausoleum of Mauretania, the Tipaza Archaeological Park, the Cherchell Museum, the Roman city of Djemila, the Sidi M'Cid Bridge, the Ahmed Bey Palace, the Emir Abdelkader Mosque, Bou Saada, El Hamel Zaouia, and the Saharan landscapes.",
    itinerary: [
      "Day 1 – Arrival in Algiers",
      "• Meet and assist at Algiers International Airport.",
      "• Transfer to the hotel in Algiers city center.",
      "• Check-in and rest.",
      "• Evening city tour of Algiers.",
      "• Dinner in Algiers city center.",
      "• Overnight in Algiers.",
      "",
      "Day 2 – Algiers City Tour",
      "• Visit the Bardo Museum.",
      "• Guided tour of the Kasbah of Algiers.",
      "• Visit the Martyrs' Memorial.",
      "• Visit Djamaâ El Djazaïr (Great Mosque of Algiers).",
      "• Return to the hotel.",
      "• Overnight in Algiers.",
      "",
      "Day 3 – Tipaza & Cherchell",
      "• Early departure to Tipaza.",
      "• Visit the Royal Mausoleum of Mauretania.",
      "• Explore the Tipaza Archaeological Park (Roman ruins).",
      "• Visit the Cherchell Museum.",
      "• Return to Algiers.",
      "• Overnight in Algiers.",
      "",
      "Day 4 – Djemila & Constantine",
      "• Departure to Djemila.",
      "• Guided tour of the Roman city of Djemila (UNESCO).",
      "• Visit the Djemila Museum.",
      "• Continue to Constantine.",
      "• Check-in at the hotel.",
      "• Overnight in Constantine.",
      "",
      "Day 5 – Constantine",
      "• Visit the Sidi M'Cid Bridge.",
      "• Visit the El Kantara Bridge.",
      "• Tour Ahmed Bey Palace.",
      "• Visit the Emir Abdelkader Mosque.",
      "• Explore the old city of Constantine.",
      "• Overnight in Constantine.",
      "",
      "Day 6 – Constantine to Bou Saada",
      "• Early departure to Bou Saada.",
      "• Check-in at the hotel.",
      "• Visit the old town of Bou Saada.",
      "• Visit the palm grove.",
      "• Traditional Saharan dinner with Bedouin ambiance.",
      "• Overnight in Bou Saada.",
      "",
      "Day 7 – Bou Saada & Desert Experience",
      "• Visit the Waterfall.",
      "• Visit Ferrero Mill.",
      "• Visit El Hamel Zaouia.",
      "• Desert excursion.",
      "• Camel ride.",
      "• Sand dunes activities.",
      "• Traditional Saharan evening.",
      "• Overnight in Bou Saada.",
      "",
      "Day 8 – Return to Algiers & Departure",
      "• Breakfast and check-out.",
      "• Travel back to Algiers.",
      "• Final city tour of Algiers.",
      "• Visit local markets.",
      "• Dinner in Algiers.",
      "• Transfer to Algiers International Airport for departure.",
    ].join("\n"),
  },
];

// ---------- قوالب المستندات الجاهزة ----------
type Tpl = { name: string; title: string; body: string };

const TEMPLATES: Tpl[] = [
  {
    name: "دعوة سياحية — Français (قنصلية)",
    title: "Lettre d'invitation",
    body: [
      "À l'attention de [CONSULATE]",
      "",
      "Objet : Demande d'approbation de visa – Lettre d'invitation touristique",
      "",
      "Madame, Monsieur,",
      "",
      "Par la présente, l'agence [AGENCY] a l'honneur de solliciter l'approbation du visa au profit de M./Mme [CLIENT], titulaire du passeport n° [PASSPORT], pour effectuer un voyage touristique en Algérie dans le cadre du programme « [PROGRAM] ».",
      "",
      "Le séjour est prévu du [START_DATE] au [END_DATE], pour un groupe de [PAX] personne(s).",
      "",
      "Notre agence se porte garante de la prise en charge du programme touristique (hébergement, transport et accompagnement) pendant toute la durée du séjour.",
      "",
      "En conséquence, nous vous prions de bien vouloir accorder à l'intéressé(e) le visa nécessaire pour la réalisation de ce voyage.",
      "",
      "Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.",
      "",
      "Fait le [TODAY]",
      "[AGENCY]",
      "",
      "---PAGE---",
      "",
      "# Programme du voyage",
      "",
      "[ITINERARY]",
    ].join("\n"),
  },
  {
    name: "دعوة سياحية — English (قنصلية)",
    title: "Letter of Invitation",
    body: [
      "To the Consulate of [CONSULATE]",
      "",
      "Subject: Request for visa approval – Tourist letter of invitation",
      "",
      "Dear Sir or Madam,",
      "",
      "We, [AGENCY], have the honour to request the approval of a visa for Mr./Ms. [CLIENT], holder of passport No. [PASSPORT], to undertake a tourist trip to Algeria under the programme \"[PROGRAM]\".",
      "",
      "The stay is scheduled from [START_DATE] to [END_DATE], for a group of [PAX] person(s).",
      "",
      "Our agency guarantees the full tourist programme (accommodation, transport and guidance) throughout the entire stay.",
      "",
      "Accordingly, we kindly request that you grant the person concerned the visa necessary to carry out this trip.",
      "",
      "Please accept the assurance of our highest consideration.",
      "",
      "Done on [TODAY]",
      "[AGENCY]",
      "",
      "---PAGE---",
      "",
      "# Trip Itinerary",
      "",
      "[ITINERARY]",
    ].join("\n"),
  },
  {
    name: "دعوة سياحية — عربي (قنصلية)",
    title: "دعوة",
    body: [
      "إلى السيد قنصل [CONSULATE]",
      "",
      "الموضوع: طلب الموافقة على تأشيرة — دعوة سياحية",
      "",
      "سيدي القنصل المحترم،",
      "",
      "يشرّف وكالة [AGENCY] أن تطلب الموافقة على منح التأشيرة للسيد/ة [CLIENT]، حامل جواز السفر رقم [PASSPORT]، للقيام برحلة سياحية إلى الجزائر ضمن برنامج «[PROGRAM]».",
      "",
      "من المقرّر أن تكون الإقامة من [START_DATE] إلى [END_DATE]، لمجموعة مكوّنة من [PAX] شخص.",
      "",
      "تتكفّل وكالتنا بكامل البرنامج السياحي (الإقامة والنقل والمرافقة) طوال مدة الرحلة.",
      "",
      "وعليه، نرجو من سيادتكم التكرّم بمنح المعنيّ التأشيرة اللازمة لتحقيق هذه الرحلة.",
      "",
      "وتفضّلوا بقبول فائق الاحترام والتقدير.",
      "",
      "حُرِّر في [TODAY]",
      "[AGENCY]",
      "",
      "---PAGE---",
      "",
      "# مخطط الرحلة",
      "",
      "[ITINERARY]",
    ].join("\n"),
  },
];

async function main() {
  let added = 0;
  let skipped = 0;

  // قوالب المستندات — نحدّث القالب الموجود إلى أحدث نسخة (مثل نسخة الدعوة بصفحتين)
  for (const t of TEMPLATES) {
    const exists = await prisma.documentTemplate.findFirst({ where: { name: t.name } });
    if (exists) {
      await prisma.documentTemplate.update({
        where: { id: exists.id },
        data: { title: t.title, body: t.body },
      });
      console.log(`↺ حُدِّث قالب: ${t.name}`);
      continue;
    }
    await prisma.documentTemplate.create({
      data: { name: t.name, title: t.title, body: t.body },
    });
    added++;
    console.log(`✓ أُضيف قالب: ${t.name}`);
  }

  for (const p of PROGRAMS) {
    const exists = await prisma.tourProgram.findFirst({ where: { name: p.name } });
    if (exists) {
      skipped++;
      console.log(`↷ موجود بالفعل: ${p.name}`);
      continue;
    }
    await prisma.tourProgram.create({
      data: {
        name: p.name,
        durationDays: p.durationDays,
        description: p.description,
        itinerary: p.itinerary,
        standardPrice: p.standardPrice ?? 0,
        currency: p.currency ?? "DZD",
      },
    });
    added++;
    console.log(`✓ أُضيف: ${p.name}`);
  }
  console.log(`\nتم: أُضيف ${added}، تم تخطي ${skipped}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
