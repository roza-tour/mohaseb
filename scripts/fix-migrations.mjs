// إصلاح هجرات قاعدة البيانات العالقة قبل تطبيق الجديد منها.
//
// ما حدث: هجرة 20260929120000 عُدِّلت بعد نشرها، فطبّق السيرفر نسخة منها فيها
// عمودا Branch.nameFr/nameEn. ثم جاءت 20260929130000 تضيفهما مرة أخرى ففشلت
// («Duplicate column name 'nameFr'»)، وPrisma يرفض أي هجرة بعد هجرة فاشلة —
// فلم يُضَف عمود Trip.reminderSentAt، وسقطت الصفحات التي تقرأ الرحلات.
//
// هذا السكربت يكمل ما تقصده تلك الهجرة خطوةً خطوة، ولا ينفّذ إلا الخطوة
// الناقصة فعلاً (آمن للتكرار وعلى أي حالة كانت عليها القاعدة)، ثم يعلّمها
// «مطبَّقة». أي هجرة فاشلة أخرى لا نعرفها يُبلَّغ عنها ويتوقف، بلا تخمين.
//
//   node scripts/fix-migrations.mjs        ← يُستدعى من fixall.sh قبل db:deploy
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT = process.cwd();

// تحميل .env (السكربت لا يحمّلها تلقائياً)
const envPath = path.join(ROOT, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

const KNOWN = "20260929130000_simplify_branches";

async function columns(table) {
  const rows = await prisma.$queryRawUnsafe(
    "SELECT COLUMN_NAME AS c FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?",
    table
  );
  return new Set(rows.map((r) => r.c));
}

async function exec(sql) {
  console.log(`   ↳ ${sql}`);
  await prisma.$executeRawUnsafe(sql);
}

// ما تقصده هجرة تبسيط الفروع — تُنفَّذ الخطوة فقط إن لم تكن قد تمّت
async function completeSimplifyBranches() {
  const branch = await columns("Branch");
  if (!branch.has("nameFr")) await exec("ALTER TABLE `Branch` ADD COLUMN `nameFr` VARCHAR(191) NOT NULL DEFAULT ''");
  if (!branch.has("nameEn")) await exec("ALTER TABLE `Branch` ADD COLUMN `nameEn` VARCHAR(191) NOT NULL DEFAULT ''");
  for (const col of ["tagline", "address", "phone", "email", "website", "rc", "logoPath", "stampPath", "letterheadColor", "bankDetails"]) {
    if (branch.has(col)) await exec(`ALTER TABLE \`Branch\` DROP COLUMN \`${col}\``);
  }
  if ((await columns("Invoice")).has("showBankDetails")) await exec("ALTER TABLE `Invoice` DROP COLUMN `showBankDetails`");
  if ((await columns("Settings")).has("bankDetails")) await exec("ALTER TABLE `Settings` DROP COLUMN `bankDetails`");
}

let code = 0;
try {
  let failed = [];
  try {
    failed = await prisma.$queryRawUnsafe(
      "SELECT migration_name AS name, logs FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL"
    );
  } catch {
    // لا يوجد جدول هجرات بعد (قاعدة جديدة) — لا شيء لإصلاحه
  }

  if (failed.length === 0) {
    console.log("✓ لا توجد هجرات عالقة");
  }

  for (const f of failed) {
    if (f.name === KNOWN) {
      console.log(`▶ إكمال الهجرة العالقة ${f.name}`);
      await completeSimplifyBranches();
      execSync(`npx --no-install prisma migrate resolve --applied ${KNOWN}`, { cwd: ROOT, stdio: "inherit" });
      console.log(`✓ اكتملت ${f.name} وعُلِّمت مطبَّقة`);
    } else {
      console.log(`✗ هجرة فاشلة غير معروفة: ${f.name}`);
      console.log(String(f.logs ?? "").split("\n").slice(0, 6).map((l) => `   ${l}`).join("\n"));
      console.log("   لم أعدّل شيئاً — أرسل هذا الناتج للمطوّر.");
      code = 1;
    }
  }
} catch (e) {
  console.log(`✗ تعذّر فحص الهجرات: ${e.message.split("\n")[0]}`);
  code = 1;
} finally {
  await prisma.$disconnect();
}
process.exit(code);
