// يضيف مواقع الفروع إلى حقل المواقع في الإعدادات، فتظهر في تذييل كل المستندات.
// آمن للتكرار: لا يضيف موقعاً موجوداً، ولا يحذف ما كتبته يدوياً، ويُسقط
// https:// من أي موقع مكتوب بها.
//   npx tsx prisma/add-websites.ts
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

const SITES = ["algeriacompass.com", "kemet-travel.com"];

// نفس تنظيف العرض: بلا بروتوكول وبلا شرطة أخيرة، وبلا تكرار
function clean(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[\s,;|]+/)) {
    const c = part.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    if (c === "" || seen.has(c.toLowerCase())) continue;
    seen.add(c.toLowerCase());
    out.push(c);
  }
  return out;
}

async function main() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings) {
    console.log("↷ لا يوجد سجل إعدادات بعد — افتح صفحة الإعدادات واحفظها ثم أعد التشغيل.");
    return;
  }

  const current = clean(settings.agencyWebsite ?? "");
  const lower = new Set(current.map((s) => s.toLowerCase()));
  const added = SITES.filter((s) => !lower.has(s.toLowerCase()));
  const final = [...current, ...added];

  if (added.length === 0 && final.join(", ") === (settings.agencyWebsite ?? "")) {
    console.log(`↷ المواقع محدَّثة بالفعل: ${final.join(", ") || "(فارغ)"}`);
    return;
  }

  await prisma.settings.update({ where: { id: 1 }, data: { agencyWebsite: final.join(", ") } });
  for (const s of added) console.log(`✓ أُضيف موقع: ${s}`);
  console.log(`\nالمواقع في تذييل المستندات الآن: ${final.join("  •  ")}`);
  if (final.length < 3) {
    console.log("⚠ موقع روزا تور غير مكتوب — أضفه من: الإعدادات ← المواقع الإلكترونية");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
