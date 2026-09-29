// إنشاء فرعَي الوكالة مرةً واحدة. الفرع اسم فقط: الفاتورة تبقى فاتورة
// روزا تور بترويستها وختمها، ويُذكَر الفرع فيها إن اختير.
// آمن للتكرار: لا يضيف فرعاً موجوداً بنفس الاسم، ولا يعدّل فرعاً قائماً.
//   npx tsx prisma/add-branches.ts
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

const BRANCHES = [
  { name: "الجيريا كومباس", nameFr: "Algeria Compass", nameEn: "Algeria Compass", sortOrder: 0 },
  { name: "كيميت ترافيل", nameFr: "Kemet Travel", nameEn: "Kemet Travel", sortOrder: 1 },
];

async function main() {
  let added = 0;
  let skipped = 0;
  for (const b of BRANCHES) {
    const exists = await prisma.branch.findFirst({ where: { name: b.name } });
    if (exists) {
      console.log(`↷ موجود بالفعل: ${b.name}`);
      skipped++;
      continue;
    }
    await prisma.branch.create({ data: b });
    added++;
    console.log(`✓ أُضيف فرع: ${b.name}`);
  }
  console.log(`\nتم: أُضيف ${added}، تم تخطي ${skipped}.`);
  if (added > 0) {
    console.log("لتعديل الأسماء (بالعربية والفرنسية والإنجليزية) أو إضافة فرع: الإعدادات ← الفروع");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
