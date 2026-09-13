// إصلاح السجلات اليتيمة في قاعدة البيانات.
//
//   node scripts/repair.mjs         # يعرض ما سيُحذف فقط (لا يحذف شيئاً)
//   node scripts/repair.mjs --yes   # ينفّذ الحذف
//
// السجل اليتيم = صف يشير إلى سجل أب غير موجود (مثل أمر تكليف لرحلة محذوفة).
// هذه الصفوف غير قابلة للعرض أصلاً، وسطر واحد منها يُسقط الصفحة كلها بخطأ خادم.
// تحدث عادةً عند حذف صفوف يدوياً من phpMyAdmin أو استعادة نسخة احتياطية ناقصة
// (بتعطيل قيود المفاتيح الأجنبية).
//
// لا يحذف هذا السكربت أي سجل سليم — فقط ما لا أب له.
import fs from "fs";
import path from "path";

const APPLY = process.argv.includes("--yes");

// تحميل .env (السكربت لا يحمّلها تلقائياً)
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

// [الوصف، الجدول، عمود الربط، جدول الأب]
const TARGETS = [
  ["أوامر تكليف بلا رحلة", "TaskOrder", "tripId", "Trip"],
  ["حجوزات فنادق بلا رحلة", "HotelBooking", "tripId", "Trip"],
  ["حجوزات طيران بلا رحلة", "FlightBooking", "tripId", "Trip"],
  ["حجوزات أخرى بلا رحلة", "OtherBooking", "tripId", "Trip"],
  ["سندات قبض بلا رحلة", "Payment", "tripId", "Trip"],
  ["مرفقات بلا رحلة", "Attachment", "tripId", "Trip"],
  ["حجوزات فنادق بلا فندق", "HotelBooking", "hotelId", "Hotel"],
  ["رحلات بلا برنامج", "Trip", "programId", "TourProgram"],
  ["رحلات بلا عميل", "Trip", "customerId", "Customer"],
  ["مسافرو فيزا بلا ملف", "VisaTraveler", "applicationId", "VisaApplication"],
];

const found = [];
console.log(APPLY ? "▶ إصلاح السجلات اليتيمة …\n" : "▶ معاينة السجلات اليتيمة (بلا حذف) …\n");

for (const [label, table, col, parent] of TARGETS) {
  let rows;
  try {
    rows = await prisma.$queryRawUnsafe(
      `SELECT c.id FROM \`${table}\` c LEFT JOIN \`${parent}\` p ON p.id = c.\`${col}\`
       WHERE c.\`${col}\` IS NOT NULL AND p.id IS NULL LIMIT 1000`
    );
  } catch (e) {
    console.log(`  ⚠ تعذّر فحص ${table}: ${String(e.message).split("\n")[0]}`);
    continue;
  }
  if (rows.length === 0) continue;
  found.push({ label, table, ids: rows.map((r) => r.id) });
  console.log(`  • ${label}: ${rows.length} سجل`);
}

if (found.length === 0) {
  console.log("  ✓ لا توجد سجلات يتيمة — قاعدة البيانات سليمة.\n");
  await prisma.$disconnect();
  process.exit(0);
}

const total = found.reduce((s, f) => s + f.ids.length, 0);

if (!APPLY) {
  console.log(`\nالمجموع: ${total} سجل يتيم.`);
  console.log("هذه السجلات لا تظهر في النظام أصلاً (أصلها محذوف) وتسبّب أخطاء في الصفحات.");
  console.log("\nللتنفيذ — خذ نسخة احتياطية أولاً ثم شغّل:");
  console.log("  node scripts/backup.mjs && node scripts/repair.mjs --yes\n");
  await prisma.$disconnect();
  process.exit(0);
}

console.log("");
let deleted = 0;
for (const { label, table, ids } of found) {
  const placeholders = ids.map(() => "?").join(",");
  try {
    const n = await prisma.$executeRawUnsafe(
      `DELETE FROM \`${table}\` WHERE id IN (${placeholders})`,
      ...ids
    );
    deleted += n;
    console.log(`  ✓ ${label}: حُذف ${n} سجل`);
  } catch (e) {
    console.log(`  ✗ ${label}: فشل الحذف — ${String(e.message).split("\n")[0]}`);
  }
}

console.log(`\n✅ تم حذف ${deleted} سجلاً يتيماً. أعد تحميل الصفحة التي كانت تعطي خطأ.\n`);
await prisma.$disconnect();
process.exit(0);
